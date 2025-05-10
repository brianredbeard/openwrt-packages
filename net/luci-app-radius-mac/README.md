# LuCI app for RADIUS MAC Authentication

This LuCI application provides a web interface for configuring the `radius-mac` service, which allows for MAC-based authentication against RADIUS servers. It uses the modern JavaScript client-rendered approach.

## Installation

In all cases, you'll want to log out of the web interface and back in to force a cache refresh after installing the new package.

### From git

To install `luci-app-radius-mac` to your OpenWrt instance from a git checkout (assuming your OpenWrt instance is on 192.168.1.1):

```sh
# From the root of the luci-app-radius-mac repository
scp -r root/* root@192.168.1.1:/
scp -r htdocs/* root@192.168.1.1:/www/
```
The `radius-mac` backend package is responsible for creating the default `/etc/config/radius-mac` file.

### From packages

Install the app on your OpenWrt installation. This can be an actual router/device, or something like a QEMU virtual machine.

`opkg install luci-app-radius-mac`

Visit the web UI for the device/virtual machine where the package was installed.
Log in to OpenWrt, and **RADIUS MAC Authentication** should be present in the navigation menu (usually under "Services").

## Application structure

See `structure.md` for details on the layout of the `luci-app-radius-mac` application.

## Code format

The LuCI Javascript code should be indented with tabs.
`js-beautify/jsbeautifier` can help with this.
The code in this application was formatted with:

    js-beautify -t -a -j -w 110 -r <filename>


## Editing the code

You can either do direct editing on the device/virtual machine, or use something like sshfs to have remote access from your development computer.

By default, the code is minified by the build process, which makes editing it non-trivial.
You can either change the build process, or just copy the file content from the git repository and replace the content on disk.

Javascript code for `luci-app-radius-mac` can be found on the device/virtual machine in `/www/luci-static/resources/view/radius-mac/`.

### [config.js](./htdocs/luci-static/resources/view/radius-mac/config.js)

This is the main JavaScript view for `luci-app-radius-mac`. It uses the `form.Map` object to provide a form for configuring the `radius-mac` service.
It relies on UCI access for the `radius-mac` configuration (read/write) and `dhcp` configuration (read-only, for populating MAC addresses from static leases).
The relevant ACL declarations are in `root/usr/share/rpcd/acl.d/luci-app-radius-mac.json`.

The configuration is stored in `/etc/config/radius-mac`. This file is typically created by the `radius-mac` backend package.

## ACLs

ACLs are global for the entire web UI. The declaration of `luci-app-radius-mac` in `root/usr/share/rpcd/acl.d/luci-app-radius-mac.json` grants permissions for this app.
Specifically, it allows:
- Read and write access to the `radius-mac` UCI configuration.
- Read-only access to the `dhcp` UCI configuration (to list static leases).

Nothing enforces that only the code in `luci-app-radius-mac` is mutating `/etc/config/radius-mac`. Once the ACL is defined to allow reads/writes to a UCI node, any code running from the web UI can make changes to that node if it has the appropriate permissions.

## Translations

For a real world application (or changes to this one that you wish to submit upstream), translations should be kept up to date.

To rebuild the translations template file (`.pot`), from the root of the LuCI repository execute:
`./build/i18n-scan.pl applications/luci-app-radius-mac > applications/luci-app-radius-mac/po/templates/radius-mac.pot`

If the scan command fails with an error about being unable to open/find `msguniq`, install the GNU `gettext` package for your operating system.
