'use strict';
'require uci';
'require form';
'require view';
// 'require network'; // Not strictly needed if relying on datatypes

return view.extend({
    load: function() {
        return Promise.all([
            uci.load('radius-mac'),
            uci.load('dhcp'),
            uci.load('network') // Load network configuration
        ]);
    },

    render: function(data) {
        let m, s, o;
        // data[0] is radius-mac UCI, data[1] is dhcp UCI, data[2] is network UCI

        m = new form.Map('radius-mac',
            _('RADIUS MAC Authentication'),
            _('Configure RADIUS MAC authentication servers and client devices. ' +
              'Changes take effect after the radius-mac service is enabled and (re)started.'));

        this.map = m; // Make map instance available for widget interaction

        // --- Server Section ---
        s = m.section(form.TypedSection, 'radius-mac-server',
            _('RADIUS Servers'),
            _('Define RADIUS server instances. Each server listens for authentication requests.'));
        s.addremove = true;
        s.anonymous = false;
        s.sortable = true;
        s.extedit = false; // No separate edit page for simple sections

        o = s.option(form.Flag, 'enable', _('Enabled')); // Changed 'enabled' to 'enable'
        o.default = o.disabled; // '0'
        o.rmempty = false;

        o = s.option(form.Value, 'address', _('Listen Address'),
            _('IP address the RADIUS server should listen on. Use 0.0.0.0 for all interfaces.'));
        o.datatype = 'ipaddr';
        o.placeholder = '0.0.0.0';
        o.validate = function(section_id, value) {
            if (!value) return _('Address is required.');
            return true;
        };

        o = s.option(form.Value, 'port', _('Port'),
            _('UDP port the RADIUS server should listen on.'));
        o.datatype = 'port';
        o.placeholder = '1812';
        o.validate = function(section_id, value) {
            if (!value) return _('Port is required.');
            return true;
        };

        o = s.option(form.Value, 'secret', _('Shared Secret'),
            _('Shared secret used to authenticate communication with the NAS (e.g., access point).'));
        o.password = true;
        o.validate = function(section_id, value) {
            if (!value) return _('Secret is required.');
            if (value.length < 1 || value.length > 256) {
                return _('Secret must be between 1 and 256 characters.');
            }
            return true;
        };

        o = s.option(form.Value, 'default_vlan', _('Default VLAN ID'),
            _('Optional: VLAN ID assigned to clients if no specific VLAN is configured for their MAC address.'));
        o.datatype = 'uinteger';
        o.optional = true;
        o.placeholder = _('1-4094, or empty');
        o.validate = function(section_id, value) {
            if (value === "" || value == null) return true;
            let num = parseInt(value, 10);
            if (isNaN(num) || num < 1 || num > 4094) {
                return _('VLAN ID must be a number between 1 and 4094.');
            }
            return true;
        };

        // --- Client Section ---
        s = m.section(form.TypedSection, 'radius-mac-client',
            _('RADIUS Clients (Devices)'),
            _('Define client devices by their MAC addresses and assign them to a server and optionally a VLAN.'));
        s.addremove = true;
        s.anonymous = false;
        s.sortable = true;
        s.extedit = false;

        o = s.option(form.ListValue, 'server', _('Associated Server'),
            _('Select the RADIUS server instance this client device authenticates against.'));
        uci.sections('radius-mac', 'radius-mac-server', function(server_section) {
            let name = server_section['.name'];
            o.value(name, _('Server: %s').format(name));
        });
        o.validate = function(section_id, value) {
            if (!value) return _('Server association is required.');
            return true;
        };

        // Collect existing VLAN IDs from network configuration
        let existing_vlans = {};
        uci.sections('network', 'device', function(device_section) {
            // Primarily look for devices of type 802.1q which explicitly define a VLAN ID
            if (device_section.type === '8021q' && device_section.vid) {
                let vid = parseInt(device_section.vid, 10);
                if (vid >= 1 && vid <= 4094) {
                    existing_vlans[vid] = String(vid);
                }
            }
            // Also consider device names that follow common VLAN sub-interface naming (e.g., eth0.10, br-lan.20)
            // This is a heuristic and might need adjustment based on common practices.
            if (device_section['.name'] && typeof device_section['.name'] === 'string') {
                const parts = device_section['.name'].split('.');
                if (parts.length > 1) {
                    let vid_candidate = parseInt(parts[parts.length - 1], 10);
                    // Check if the base part of the name (e.g., 'eth0', 'br-lan') exists as a device or bridge
                    // This helps avoid misinterpreting things like IP addresses or version numbers in names.
                    // For simplicity here, we'll just check if it's a plausible VLAN ID.
                    if (vid_candidate >= 1 && vid_candidate <= 4094) {
                         // To avoid adding device names that are not actual VLAN interfaces (e.g. 'group1.10' if 'group1' is not a base interface)
                         // we rely on the type '8021q' or explicit 'vid' option as more reliable sources.
                         // This part can be made more robust if needed by checking if parts[0] is a known base interface.
                         // For now, we'll be a bit more restrictive to avoid false positives.
                         // Only add if the device type is bridge or if it's a common ethernet type.
                        if (device_section.type === 'bridge' || device_section['.type'] === 'device' && (device_section.ifname || device_section.name)) {
                             // This logic is still a bit broad. Prefer explicit vid or 8021q type.
                             // Let's only add if we are reasonably sure it's a VLAN sub-interface.
                             // A more robust way would be to check if parts[0] is a valid physical or bridge interface.
                             // For now, we'll add it if it looks like a VLAN ID and the base device is a bridge.
                            if (device_section.type === 'bridge' && parts.length > 1 && /^[a-zA-Z0-9_-]+$/.test(parts[0])) {
                                 existing_vlans[vid_candidate] = String(vid_candidate);
                            }
                        }
                    }
                }
            }
        });
        // The interface section 'vlan' option is not standard for defining selectable VLAN IDs.
        // It's usually for specific switch configurations, not general VLAN interface definitions.
        // Removing the uci.sections('network', 'interface', ...) loop for iface_section.vlan.

        // DHCP Host Selector (helper, not directly saved)
        let dhcp_static_hosts = [];
        uci.sections('dhcp', 'host', function(host_section) {
            // Ensure host_section.mac is an array of strings to iterate over
            let macs_to_process = [];
            if (host_section.mac) {
                if (Array.isArray(host_section.mac)) {
                    macs_to_process = host_section.mac;
                } else if (typeof host_section.mac === 'string') {
                    macs_to_process = [host_section.mac];
                }
            }

            macs_to_process.forEach(function(mac_addr) {
                if (typeof mac_addr === 'string') { // Ensure it's a string before processing
                    let lower_mac = mac_addr.toLowerCase();
                    if (lower_mac !== 'ff:ff:ff:ff:ff:ff' && lower_mac !== '00:00:00:00:00:00') {
                        dhcp_static_hosts.push({
                            mac: lower_mac,
                            name: host_section.name || '', // Hostname applies to all MACs in this section
                            display: `${host_section.name || _('Unnamed Host')} (${lower_mac})`
                        });
                    }
                }
            });
        });

        if (dhcp_static_hosts.length > 0) {
            o = s.option(form.ListValue, '_dhcp_host_select',
                _('Populate from DHCP Static Lease'),
                _('Select a device from DHCP static leases to auto-fill MAC address and description fields.'));
            o.optional = true;
            o.placeholder = _('Click to select a device...');
            o.value('', _('-- Manual Entry / Do Not Populate --')); // Default empty value
            dhcp_static_hosts.sort((a,b) => a.display.localeCompare(b.display)).forEach(function(host) {
                o.value(host.mac, host.display); // Value is the MAC
            });

            o.onchange = function(ev, section_id, selected_mac) {
                if (!selected_mac) { // If "-- Manual Entry --" or empty is selected
                    this.map.sectionWidgets[section_id].optionWidgets._dhcp_host_select.setValue(''); // Ensure it's reset if re-selected
                    return;
                }

                let host_info = dhcp_static_hosts.find(h => h.mac === selected_mac);
                if (!host_info) return;

                let client_section_instance = this.map.sectionWidgets[section_id];

                // Update MAC field
                let mac_widget = client_section_instance.optionWidgets.mac;
                if (mac_widget) {
                    mac_widget.setValue(host_info.mac);
                }

                // Update description field
                let desc_widget = client_section_instance.optionWidgets.description;
                if (desc_widget && host_info.name) {
                    desc_widget.setValue(host_info.name);
                }
                // Reset this selector to allow re-selection or to clear it
                this.setValue(''); // 'this' refers to the ListValue widget instance (_dhcp_host_select)
            };
        }

        o = s.option(form.Value, 'mac', _('MAC Address'));
        o.datatype = 'macaddr';
        o.validate = function(section_id, value) {
            if (!value) return _('MAC address is required.');
            // Basic MAC format check is handled by 'macaddr' datatype
            // Additional normalization (e.g. tolower) is good practice if backend expects it,
            // but UCI usually handles values as-is. The init script normalizes.
            return true;
        };

        o = s.option(form.Value, 'description', _('Description'),
            _('Optional: A descriptive name for this client device.'));
        o.optional = true;
        o.validate = function(section_id, value) {
            if (value && (value.length < 1 || value.length > 256)) {
                return _('Description must be between 1 and 256 characters.');
            }
            return true;
        };

        o = s.option(form.DynamicList, 'vlan', _('VLAN ID'),
            _('Optional: Specific VLAN ID for this client. Overrides server default.'));
        o.optional = true;
        o.datatype = 'uinteger'; // For custom input validation
        o.placeholder = _('1-4094, or empty for server default'); // This placeholder is for the input field when "custom" is chosen

        // Populate with discovered VLANs
        let sorted_vlan_ids = Object.keys(existing_vlans).map(v_id => existing_vlans[v_id]).filter(Boolean).map(Number).sort((a, b) => a - b);
        // Remove duplicates that might have occurred if collected from multiple sources
        let unique_sorted_vlan_ids = [...new Set(sorted_vlan_ids)];

        unique_sorted_vlan_ids.forEach(function(vid_str) {
            o.value(String(vid_str), String(vid_str)); // Add each valid, unique VLAN ID
        });
        // DynamicList inherently allows custom values if not in the list, which are then validated.

        o.validate = function(section_id, value) {
            if (value === "" || value == null) return true; // Empty is allowed
            let num = parseInt(value, 10);
            if (isNaN(num) || num < 1 || num > 4094) {
                return _('VLAN ID must be a number between 1 and 4094.');
            }
            return true;
        };

        return m.render();
    }
    // No handleSave, handleSaveApply, handleReset needed; defaults will be used.
});
