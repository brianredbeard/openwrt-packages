'use strict';
'require uci';
'require form';
'require view';
// 'require network'; // Not strictly needed if relying on datatypes

return view.extend({
    load: function() {
        return Promise.all([
            uci.load('radius-mac'),
            uci.load('dhcp')
        ]);
    },

    render: function(data) {
        let m, s, o;

        m = new form.Map('radius-mac',
            _('RADIUS MAC Authentication'),
            _('Configure RADIUS MAC authentication servers and client devices. ' +
              'Ensure the radius-mac service is enabled and started for changes to take effect.'));

        this.map = m; // Make map instance available for widget interaction

        // --- Server Section ---
        s = m.section(form.TypedSection, 'radius-mac-server',
            _('RADIUS Servers'),
            _('Define RADIUS server instances. Each server listens for authentication requests.'));
        s.addremove = true;
        s.anonymous = false;
        s.sortable = true;
        s.extedit = false; // No separate edit page for simple sections

        o = s.option(form.Flag, 'enabled', _('Enabled'));
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

        // DHCP Host Selector (helper, not directly saved)
        let dhcp_static_hosts = [];
        uci.sections('dhcp', 'host', function(host_section) {
            if (host_section.mac && host_section.mac.toLowerCase() !== 'ff:ff:ff:ff:ff:ff' && host_section.mac !== '00:00:00:00:00:00') {
                dhcp_static_hosts.push({
                    mac: host_section.mac.toLowerCase(),
                    name: host_section.name || '',
                    display: `${host_section.name || _('Unnamed Host')} (${host_section.mac.toLowerCase()})`
                });
            }
        });

        if (dhcp_static_hosts.length > 0) {
            o = s.option(form.ListValue, '_dhcp_host_select',
                _('Populate from DHCP Static Lease'),
                _('Select a device from DHCP static leases to auto-fill MAC and Description.'));
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

        o = s.option(form.Value, 'vlan', _('VLAN ID'),
            _('Optional: Specific VLAN ID for this client. Overrides server default.'));
        o.datatype = 'uinteger';
        o.optional = true;
        o.placeholder = _('1-4094, or empty for server default');
        o.validate = function(section_id, value) {
            if (value === "" || value == null) return true;
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
