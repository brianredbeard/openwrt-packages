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
        // data[0] is radius-mac UCI, data[1] is dhcp UCI, data[2] is network UCI
        // We use uci.sections() to iterate, which uses the loaded data implicitly.

        let container = E('div', {}, [
            E('h2', {}, _('RADIUS MAC Authentication')),
            E('p', {}, _('Configure RADIUS MAC authentication servers and client devices. ' +
                         'Changes take effect after the radius-mac service is enabled and (re)started.'))
        ]);

        // --- RADIUS Servers Table ---
        container.appendChild(E('h3', {}, _('RADIUS Servers')));
        
        let addServerButton = E('button', {
            'class': 'cbi-button cbi-button-add',
            'click': ui.createHandlerFn(this, function() {
                // Placeholder for Add Server functionality
                // This would typically involve uci.add('radius-mac', 'radius-mac-server')
                // and then navigating to an edit view for the new (named or anonymous) section.
                console.log('Add Server clicked');
                alert(_('Add Server functionality not yet implemented.'));
            })
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
            serversTable.appendChild(E('tr', { 'class': 'tr cbi-rowstyle-1' }, [ // Alternating styles can be added
                E('td', { 'class': 'td' }, section['.name']),
                E('td', { 'class': 'td' }, (section.enable === '1' ? _('Yes') : _('No'))),
                E('td', { 'class': 'td' }, section.address || '-'),
                E('td', { 'class': 'td' }, section.port || '-'),
                E('td', { 'class': 'td' }, section.default_vlan || '-'),
                E('td', { 'class': 'td' }, [
                    E('button', {
                        'class': 'cbi-button cbi-button-edit',
                        'click': ui.createHandlerFn(this, function() {
                            // Placeholder for Edit Server functionality
                            // This would navigate to a form view for this specific section.
                            console.log('Edit Server clicked for: ' + section['.name']);
                            alert(_('Edit Server functionality for "%s" not yet implemented.').format(section['.name']));
                        })
                    }, _('Edit')),
                    ' ', // Spacer
                    E('button', {
                        'class': 'cbi-button cbi-button-remove',
                        'click': ui.createHandlerFn(this, function() {
                            // Placeholder for Delete Server functionality
                            // This would involve uci.remove('radius-mac', section['.name']) and a view refresh.
                            console.log('Delete Server clicked for: ' + section['.name']);
                             if (confirm(_('Are you sure you want to delete server "%s"?').format(section['.name']))) {
                                uci.remove('radius-mac', section['.name']);
                                uci.save().then(() => uci.apply()).then(() => view.reset()); // Save, apply, and refresh view
                            }
                        })
                    }, _('Delete'))
                ])
            ]));
        });
        container.appendChild(serversTable);
        if (uci.sections('radius-mac', 'radius-mac-server').length === 0) {
            container.appendChild(E('p', {}, _('There are no RADIUS servers configured yet.')));
        }


        // --- RADIUS Clients Table ---
        container.appendChild(E('h3', {}, _('RADIUS Clients (Devices)')));

        let addClientButton = E('button', {
            'class': 'cbi-button cbi-button-add',
            'click': ui.createHandlerFn(this, function() {
                // Placeholder for Add Client functionality
                console.log('Add Client clicked');
                alert(_('Add Client functionality not yet implemented.'));
            })
        }, _('Add Client'));
        container.appendChild(addClientButton);

        let clientsTable = E('table', { 'class': 'table cbi-section-table' }, [
            E('tr', { 'class': 'tr table-titles' }, [
                E('th', { 'class': 'th' }, _('Name')), // Section name
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
                            // Placeholder for Edit Client functionality
                            console.log('Edit Client clicked for: ' + section['.name']);
                            alert(_('Edit Client functionality for "%s" not yet implemented.').format(section['.name']));
                        })
                    }, _('Edit')),
                    ' ', // Spacer
                    E('button', {
                        'class': 'cbi-button cbi-button-remove',
                        'click': ui.createHandlerFn(this, function() {
                            // Placeholder for Delete Client functionality
                            console.log('Delete Client clicked for: ' + section['.name']);
                            if (confirm(_('Are you sure you want to delete client "%s"?').format(section['.name']))) {
                                uci.remove('radius-mac', section['.name']);
                                uci.save().then(() => uci.apply()).then(() => view.reset()); // Save, apply, and refresh view
                            }
                        })
                    }, _('Delete'))
                ])
            ]));
        });
        container.appendChild(clientsTable);
        if (uci.sections('radius-mac', 'radius-mac-client').length === 0) {
            container.appendChild(E('p', {}, _('There are no RADIUS clients configured yet.')));
        }

        // Standard Save & Apply buttons
        let saveApplyBtn = E('div', { 'class': 'cbi-page-actions' }, [
            E('button', {
                'class': 'cbi-button cbi-button-save',
                'click': ui.createHandlerFn(this, function() {
                    // For a list view, direct save/apply might not be needed if edits are per-item.
                    // However, if reordering or other list-wide changes were possible, it would be.
                    // For now, this can be a general "apply changes" if any were made via modals/sub-views.
                    // Or, it can be removed if all saves are handled within item-specific edit forms.
                    // Since we added delete functionality that calls uci.save().then(uci.apply),
                    // this button might be redundant or for other potential changes.
                    // For now, let's make it a generic "Refresh" or keep it as a placeholder.
                    // view.reset() will re-run load and render.
                    uci.save().then(() => uci.apply()).then(() => {
                        // Optionally, provide feedback that settings were saved/applied.
                        // For now, just refresh.
                        view.reset();
                    }).catch(e => {
                        console.error('Save/Apply failed', e);
                        // Add user feedback for failure
                    });
                })
            }, _('Save & Apply')),
            E('button', {
                'class': 'cbi-button cbi-button-reset',
                'click': ui.createHandlerFn(this, function() {
                    view.reset(); // Reloads data and re-renders the view
                })
            }, _('Reset'))
        ]);
        // container.appendChild(saveApplyBtn); // Decided to remove global Save & Apply for now as edits are per item.

        return container;
    }
    // No handleSave, handleSaveApply, handleReset needed for the main list view itself if edits are handled elsewhere.
});
