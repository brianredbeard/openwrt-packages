'use strict';
'require uci';
'require form';
'require view';
'require ui'; // Add ui module for ui.createHandlerFn
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
        const path = L.env.dispatchpath;
        let targetNode = E('div');

        if (path.length > 2 && path[2] === 'edit_server' && path[3]) {
            this.renderServerForm(targetNode, path[3], false);
        } else if (path.length > 2 && path[2] === 'add_server') {
            // For add, we first prompt for name, then redirect to edit view with new name
            // This logic is better handled in the button click itself.
            // For now, if directly navigated, show a message or redirect to list.
            // Or, directly call a function that renders the form for a new section.
             this.handleAddServer(targetNode);
        } else if (path.length > 2 && path[2] === 'edit_client' && path[3]) {
            this.renderClientForm(targetNode, path[3], false);
        } else if (path.length > 2 && path[2] === 'add_client') {
            this.handleAddClient(targetNode);
        } else {
            this.renderListView(targetNode);
        }
        return targetNode;
    },

    renderBackButton: function() {
        return E('button', {
            'class': 'cbi-button cbi-button-link',
            'click': function() { L.goto('admin', 'services', 'radius-mac', 'config'); }
        }, _('Back to list'));
    },

    renderListView: function(container) {
        container.appendChild(E('h2', {}, _('RADIUS MAC Authentication')));
        container.appendChild(E('p', {}, _('Configure RADIUS MAC authentication servers and client devices. ' +
                         'Changes take effect after the radius-mac service is enabled and (re)started.')));

        // --- RADIUS Servers Table ---
        container.appendChild(E('h3', {}, _('RADIUS Servers')));
        
        let addServerButton = E('button', {
            'class': 'cbi-button cbi-button-add',
            'click': ui.createHandlerFn(this, this.handleAddServer, container)
        }, _('Add Server'));
        container.appendChild(addServerButton);

        let serversTable = E('table', { 'class': 'table cbi-section-table' }, [
            E('tr', { 'class': 'tr table-titles' }, [
                E('th', { 'class': 'th' }, _('Name')),
                E('th', { 'class': 'th' }, _('Enabled')),
                E('th', { 'class': 'th' }, _('Listen Address')),
                E('th', { 'class': 'th' }, _('Port')),
                E('th', { 'class': 'th' }, _('Default VLAN ID')),
                E('th', { 'class': 'th' }, _('Actions'))
            ])
        ]);

        uci.sections('radius-mac', 'radius-mac-server', function(section) {
            serversTable.appendChild(E('tr', { 'class': 'tr cbi-rowstyle-1' }, [
                E('td', { 'class': 'td' }, section['.name']),
                E('td', { 'class': 'td' }, (section.enable === '1' ? _('Yes') : _('No'))),
                E('td', { 'class': 'td' }, section.address || '-'),
                E('td', { 'class': 'td' }, section.port || '-'),
                E('td', { 'class': 'td' }, section.default_vlan || '-'),
                E('td', { 'class': 'td' }, [
                    E('button', {
                        'class': 'cbi-button cbi-button-edit',
                        'click': ui.createHandlerFn(this, function() { L.goto('admin', 'services', 'radius-mac', 'config', 'edit_server', section['.name']); })
                    }, _('Edit')),
                    ' ', 
                    E('button', {
                        'class': 'cbi-button cbi-button-remove',
                        'click': ui.createHandlerFn(this, function() {
                             if (confirm(_('Are you sure you want to delete server "%s"?').format(section['.name']))) {
                                uci.remove('radius-mac', section['.name']);
                                uci.save().then(() => uci.apply()).then(() => view.reset());
                            }
                        })
                    }, _('Delete'))
                ])
            ]));
        }.bind(this));
        container.appendChild(serversTable);
        if (uci.sections('radius-mac', 'radius-mac-server').length === 0) {
            container.appendChild(E('p', {}, _('There are no RADIUS servers configured yet.')));
        }

        // --- RADIUS Clients Table ---
        container.appendChild(E('h3', {}, _('RADIUS Clients (Devices)')));

        let addClientButton = E('button', {
            'class': 'cbi-button cbi-button-add',
            'click': ui.createHandlerFn(this, this.handleAddClient, container)
        }, _('Add Client'));
        container.appendChild(addClientButton);

        let clientsTable = E('table', { 'class': 'table cbi-section-table' }, [
            E('tr', { 'class': 'tr table-titles' }, [
                E('th', { 'class': 'th' }, _('Name')),
                E('th', { 'class': 'th' }, _('MAC Address')),
                E('th', { 'class': 'th' }, _('Description')),
                E('th', { 'class': 'th' }, _('Associated Server')),
                E('th', { 'class': 'th' }, _('VLAN ID')),
                E('th', { 'class': 'th' }, _('Actions'))
            ])
        ]);

        uci.sections('radius-mac', 'radius-mac-client', function(section) {
            clientsTable.appendChild(E('tr', { 'class': 'tr cbi-rowstyle-1' }, [
                E('td', { 'class': 'td' }, section['.name']),
                E('td', { 'class': 'td' }, section.mac || '-'),
                E('td', { 'class': 'td' }, section.description || '-'),
                E('td', { 'class': 'td' }, section.server || '-'),
                E('td', { 'class': 'td' }, section.vlan || '-'),
                E('td', { 'class': 'td' }, [
                    E('button', {
                        'class': 'cbi-button cbi-button-edit',
                        'click': ui.createHandlerFn(this, function() { L.goto('admin', 'services', 'radius-mac', 'config', 'edit_client', section['.name']); })
                    }, _('Edit')),
                    ' ',
                    E('button', {
                        'class': 'cbi-button cbi-button-remove',
                        'click': ui.createHandlerFn(this, function() {
                            if (confirm(_('Are you sure you want to delete client "%s"?').format(section['.name']))) {
                                uci.remove('radius-mac', section['.name']);
                                uci.save().then(() => uci.apply()).then(() => view.reset());
                            }
                        })
                    }, _('Delete'))
                ])
            ]));
        }.bind(this));
        container.appendChild(clientsTable);
        if (uci.sections('radius-mac', 'radius-mac-client').length === 0) {
            container.appendChild(E('p', {}, _('There are no RADIUS clients configured yet.')));
        }
    },

    handleAddServer: function(container_or_event_target) {
        // If called from direct navigation (add_server path), container_or_event_target is the main container.
        // If called from button click, it's the button, and we need to clear the main container.
        let targetNode = (container_or_event_target && container_or_event_target.nodeName === 'DIV') ? container_or_event_target : document.querySelector('.main-content') || document.body;
        
        L.ui.prompt(_('Enter a name for the new RADIUS server:'), '', _('Add New Server')).then(function(name) {
            if (name) {
                let section_id = uci.add('radius-mac', 'radius-mac-server', name);
                if (section_id) {
                    // Set some defaults if needed, e.g., uci.set('radius-mac', section_id, 'port', '1812');
                    uci.save().then(function() {
                        L.goto('admin', 'services', 'radius-mac', 'config', 'edit_server', section_id);
                    }).catch(function(e) { L.ui.error(_('Failed to create server: %s').format(e.message)); });
                } else {
                    L.ui.error(_('Failed to create a new server section. The name might be invalid or already in use.'));
                }
            }
        }).catch(function() { /* Prompt dismissed */ });
    },

    renderServerForm: function(container, sectionName, isAdd) {
        let m, s, o;

        m = new form.Map('radius-mac',
            isAdd ? _('Add New RADIUS Server') : _('Edit RADIUS Server "%s"').format(sectionName),
            _('Configure RADIUS server instance.'));

        s = m.section(form.NamedSection, sectionName, 'radius-mac-server');
        s.anonymous = false; // Sections must be named
        s.addremove = false; // Add/remove is handled by the list view

        o = s.option(form.Flag, 'enable', _('Enabled'));
        o.default = o.disabled; // '0'
        o.rmempty = false;

        o = s.option(form.Value, 'address', _('Listen Address'),
            _('IP address the RADIUS server should listen on. Use 0.0.0.0 for all interfaces.'));
        o.datatype = 'ipaddr';
        o.placeholder = '0.0.0.0';
        o.validate = function(sid, value) {
            if (!value) return _('Address is required.');
            return true;
        };

        o = s.option(form.Value, 'port', _('Port'),
            _('UDP port the RADIUS server should listen on.'));
        o.datatype = 'port';
        o.placeholder = '1812';
        o.validate = function(sid, value) {
            if (!value) return _('Port is required.');
            return true;
        };

        o = s.option(form.Value, 'secret', _('Shared Secret'),
            _('Shared secret used to authenticate communication with the NAS (e.g., access point).'));
        o.password = true;
        o.validate = function(sid, value) {
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
        o.validate = function(sid, value) {
            if (value === "" || value == null) return true;
            let num = parseInt(value, 10);
            if (isNaN(num) || num < 1 || num > 4094) {
                return _('VLAN ID must be a number between 1 and 4094.');
            }
            return true;
        };
        
        let formActions = E('div', { 'class': 'cbi-page-actions' }, [
            E('button', {
                'class': 'cbi-button cbi-button-save',
                'click': ui.createHandlerFn(this, function() {
                    m.save(null, false).then(function() { // Just save
                        L.goto('admin', 'services', 'radius-mac', 'config');
                    }).catch(function(e) { L.ui.error(_('Save failed: %s').format(e.message)); });
                })
            }, _('Save')),
            E('button', {
                'class': 'cbi-button cbi-button-apply',
                'click': ui.createHandlerFn(this, function() {
                    m.save(null, true).then(function() { // Save and apply
                        L.goto('admin', 'services', 'radius-mac', 'config');
                    }).catch(function(e) { L.ui.error(_('Save & Apply failed: %s').format(e.message)); });
                })
            }, _('Save & Apply')),
            E('button', {
                'class': 'cbi-button cbi-button-reset',
                'click': ui.createHandlerFn(this, function() { m.reset(); })
            }, _('Reset')),
            this.renderBackButton()
        ]);

        m.render().then(function(mapEl) {
            container.innerHTML = ''; // Clear previous content (e.g., list view)
            container.appendChild(mapEl);
            container.appendChild(formActions);
        }).catch(function(e) {
            container.innerHTML = '';
            L.ui.error(_('Failed to render server form: %s').format(e.message));
            container.appendChild(this.renderBackButton());
        }.bind(this));
    },

    handleAddClient: function(container_or_event_target) {
        let targetNode = (container_or_event_target && container_or_event_target.nodeName === 'DIV') ? container_or_event_target : document.querySelector('.main-content') || document.body;

        L.ui.prompt(_('Enter a name for the new RADIUS client:'), '', _('Add New Client')).then(function(name) {
            if (name) {
                let section_id = uci.add('radius-mac', 'radius-mac-client', name);
                if (section_id) {
                    uci.save().then(function() {
                        L.goto('admin', 'services', 'radius-mac', 'config', 'edit_client', section_id);
                    }).catch(function(e) { L.ui.error(_('Failed to create client: %s').format(e.message)); });
                } else {
                    L.ui.error(_('Failed to create a new client section. The name might be invalid or already in use.'));
                }
            }
        }).catch(function() { /* Prompt dismissed */ });
    },

    renderClientForm: function(container, sectionName, isAdd) {
        let m, s, o;

        m = new form.Map('radius-mac',
            isAdd ? _('Add New RADIUS Client') : _('Edit RADIUS Client "%s"').format(sectionName),
            _('Configure RADIUS client device.'));
        
        this.map = m; // Make map instance available for widget interaction, e.g., for DHCP host selector

        s = m.section(form.NamedSection, sectionName, 'radius-mac-client');
        s.anonymous = false;
        s.addremove = false;

        o = s.option(form.ListValue, 'server', _('Associated Server'),
            _('Select the RADIUS server instance this client device authenticates against.'));
        uci.sections('radius-mac', 'radius-mac-server', function(server_section) {
            let name = server_section['.name'];
            o.value(name, _('Server: %s').format(name));
        });
        o.validate = function(sid, value) {
            if (!value) return _('Server association is required.');
            return true;
        };

        // DHCP Host Selector logic (copied and adapted from original full form)
        let dhcp_static_hosts = [];
        uci.sections('dhcp', 'host', function(host_section) {
            let macs_to_process = [];
            if (host_section.mac) {
                if (Array.isArray(host_section.mac)) {
                    macs_to_process = host_section.mac;
                } else if (typeof host_section.mac === 'string') {
                    macs_to_process = [host_section.mac];
                }
            }
            macs_to_process.forEach(function(mac_addr) {
                if (typeof mac_addr === 'string') {
                    let lower_mac = mac_addr.toLowerCase();
                    if (lower_mac !== 'ff:ff:ff:ff:ff:ff' && lower_mac !== '00:00:00:00:00:00') {
                        dhcp_static_hosts.push({
                            mac: lower_mac,
                            name: host_section.name || '',
                            display: `${host_section.name || _('Unnamed Host')} (${lower_mac})`
                        });
                    }
                }
            });
        });

        if (dhcp_static_hosts.length > 0) {
            let dhcp_select = s.option(form.ListValue, '_dhcp_host_select',
                _('Populate from DHCP Static Lease'),
                _('Select a device from DHCP static leases to auto-fill MAC address and description fields.'));
            dhcp_select.optional = true;
            dhcp_select.placeholder = _('Click to select a device...');
            dhcp_select.value('', _('-- Manual Entry / Do Not Populate --'));
            dhcp_static_hosts.sort((a,b) => a.display.localeCompare(b.display)).forEach(function(host) {
                dhcp_select.value(host.mac, host.display);
            });

            dhcp_select.onchange = function(ev, section_id_map, selected_mac_val) { // section_id_map is actually the section_id for the form.Map
                if (!selected_mac_val) {
                     this.map.sectionWidgets[sectionName].optionWidgets._dhcp_host_select.setValue('');
                    return;
                }
                let host_info = dhcp_static_hosts.find(h => h.mac === selected_mac_val);
                if (!host_info) return;

                let client_section_instance = this.map.sectionWidgets[sectionName]; // Use sectionName passed to renderClientForm

                let mac_widget = client_section_instance.optionWidgets.mac;
                if (mac_widget) mac_widget.setValue(host_info.mac);

                let desc_widget = client_section_instance.optionWidgets.description;
                if (desc_widget && host_info.name) desc_widget.setValue(host_info.name);
            }.bind({map: m}); // Bind the map instance to 'this' context in onchange
        }

        o = s.option(form.Value, 'mac', _('MAC Address'));
        o.datatype = 'macaddr';
        o.validate = function(sid, value) {
            if (!value) return _('MAC address is required.');
            return true;
        };

        o = s.option(form.Value, 'description', _('Description'),
            _('Optional: A descriptive name for this client device.'));
        o.optional = true;
        o.validate = function(sid, value) {
            if (value && (value.length < 1 || value.length > 256)) {
                return _('Description must be between 1 and 256 characters.');
            }
            return true;
        };
        
        // VLAN ID Selector logic (copied and adapted)
        let vlan_display_map = {};
        let kernel_device_to_vid = {}; 
        let uci_device_section_to_vid = {};

        uci.sections('network', 'device', function(dev_s) {
            let vid = null;
            let kernel_name = dev_s.name;
            if (dev_s.type === '8021q' && dev_s.vid) vid = parseInt(dev_s.vid, 10);
            else if (kernel_name && typeof kernel_name === 'string') {
                const match = kernel_name.match(/\.(\d+)$/);
                if (match && match[1]) vid = parseInt(match[1], 10);
            }
            if (vid !== null && !isNaN(vid) && vid >= 1 && vid <= 4094) {
                if (kernel_name) kernel_device_to_vid[kernel_name] = vid;
                uci_device_section_to_vid[dev_s['.name']] = vid;
                vlan_display_map[String(vid)] = String(vid);
            }
        });
        uci.sections('network', 'interface', function(if_s) {
            let device_name = if_s.device;
            if (device_name && typeof device_name === 'string') {
                let vid = kernel_device_to_vid[device_name] || uci_device_section_to_vid[device_name];
                if (vid !== undefined) {
                    let interface_uci_name = if_s['.name'];
                    if (interface_uci_name) vlan_display_map[String(vid)] = `${vid} (${interface_uci_name})`;
                }
            }
        });
        uci.sections('radius-mac', 'radius-mac-server', function(rms_s) {
            if (rms_s.default_vlan) {
                let vid = parseInt(rms_s.default_vlan, 10);
                if (!isNaN(vid) && vid >= 1 && vid <= 4094 && !vlan_display_map[String(vid)]) {
                    vlan_display_map[String(vid)] = String(vid);
                }
            }
        });
        uci.sections('radius-mac', 'radius-mac-client', function(rmc_s) {
            if (rmc_s.vlan) {
                let vid = parseInt(rmc_s.vlan, 10);
                if (!isNaN(vid) && vid >= 1 && vid <= 4094 && !vlan_display_map[String(vid)]) {
                    vlan_display_map[String(vid)] = String(vid);
                }
            }
        });

        o = s.option(form.DynamicList, 'vlan', _('VLAN ID'),
            _('Optional: Specific VLAN ID for this client. Overrides server default.'));
        o.optional = true;
        o.datatype = 'uinteger';
        o.placeholder = _('1-4094, or empty for server default');
        
        let sorted_vlan_entries = Object.keys(vlan_display_map)
            .map(vid_key => ({ id: vid_key, name: vlan_display_map[vid_key] }))
            .sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
        sorted_vlan_entries.forEach(function(vlan_entry) {
            o.value(vlan_entry.id, vlan_entry.name);
        });
        o.validate = function(sid, value) {
            if (value === "" || value == null) return true;
            let num = parseInt(value, 10);
            if (isNaN(num) || num < 1 || num > 4094) {
                return _('VLAN ID must be a number between 1 and 4094.');
            }
            return true;
        };

        let formActions = E('div', { 'class': 'cbi-page-actions' }, [
            E('button', {
                'class': 'cbi-button cbi-button-save',
                'click': ui.createHandlerFn(this, function() {
                    m.save(null, false).then(function() {
                        L.goto('admin', 'services', 'radius-mac', 'config');
                    }).catch(function(e) { L.ui.error(_('Save failed: %s').format(e.message)); });
                })
            }, _('Save')),
            E('button', {
                'class': 'cbi-button cbi-button-apply',
                'click': ui.createHandlerFn(this, function() {
                    m.save(null, true).then(function() {
                        L.goto('admin', 'services', 'radius-mac', 'config');
                    }).catch(function(e) { L.ui.error(_('Save & Apply failed: %s').format(e.message)); });
                })
            }, _('Save & Apply')),
            E('button', {
                'class': 'cbi-button cbi-button-reset',
                'click': ui.createHandlerFn(this, function() { m.reset(); })
            }, _('Reset')),
            this.renderBackButton()
        ]);

        m.render().then(function(mapEl) {
            container.innerHTML = '';
            container.appendChild(mapEl);
            container.appendChild(formActions);
        }).catch(function(e) {
            container.innerHTML = '';
            L.ui.error(_('Failed to render client form: %s').format(e.message));
            container.appendChild(this.renderBackButton());
        }.bind(this));
    }
});
