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
            // Placeholder for client edit form
            targetNode.appendChild(E('p', {}, _('Client edit form for %s to be implemented.').format(path[3])));
            targetNode.appendChild(this.renderBackButton());
        } else if (path.length > 2 && path[2] === 'add_client') {
            // Placeholder for client add form
            targetNode.appendChild(E('p', {}, _('Client add form to be implemented.')));
            targetNode.appendChild(this.renderBackButton());
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
                        'click': function() { L.goto('admin', 'services', 'radius-mac', 'config', 'edit_server', section['.name']); }
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
            'click': ui.createHandlerFn(this, function() {
                alert(_('Add Client functionality not yet implemented.'));
            })
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
                        'click': ui.createHandlerFn(this, function() {
                            alert(_('Edit Client functionality for "%s" not yet implemented.').format(section['.name']));
                        })
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
    }
});
