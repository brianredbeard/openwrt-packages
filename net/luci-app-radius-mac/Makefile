# Makefile for luci-app-radius-mac
# Copyright (C) 2025 Your Name <your.email@example.com>
# This is free software, licensed under the Apache-2.0 License.

include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI app for RADIUS MAC Authentication
LUCI_DEPENDS:=+luci-base +radius-mac
LUCI_PKGARCH:=all

PKG_NAME:=luci-app-radius-mac
PKG_VERSION:=1.0
PKG_RELEASE:=1

# Use your name and email
PKG_MAINTAINER:=Your Name <your.email@example.com>
# Choose a license, Apache-2.0 is common for LuCI apps
PKG_LICENSE:=Apache-2.0

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
