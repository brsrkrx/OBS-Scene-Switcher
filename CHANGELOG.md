# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-22

### Added
- 🎯 **Dual Platform Support** - Works with both Chaturbate AND Joystick.tv simultaneously
- 🔄 **Auto-Install System** - WebSocket library installs automatically when needed
- 📱 **config.json System** - Clean configuration file instead of editing code
- 🎨 **Visual Configuration Editor** - No code editing required
- 📘 **Comprehensive Documentation** - Multiple detailed guides
- ✅ **Smart Validation** - Checks config.json on startup with helpful errors
- 🛡️ **Platform Toggle UI** - Visual platform selection in editor
- 📍 **Direct Links** - All setup pages link directly to correct URLs
- 🎯 **Automatic Detection** - Server detects missing dependencies and offers to install

### Changed
- 🔧 Unified server now reads from config.json instead of hard-coded values
- 📖 All documentation updated for new config system
- 🚀 Installation process simplified significantly

### Improved
- ⚡ Better error messages with clear instructions
- 🎨 Enhanced UI in editor with visual platform toggles
- 📝 Chaturbate token generation instructions added to editor
- 🔄 Joystick.tv bot creation flow improved with step-by-step guide

### Security
- 🔒 config.json excluded from Git by default
- 🛡️ Credentials never committed to repository
- ⚠️ Clear warnings about keeping secrets safe

### Documentation
- 📘 CONFIG_GUIDE.md - Complete config.json documentation
- 🔧 AUTO_INSTALL_GUIDE.md - WebSocket auto-install explanation
- 📍 NPM_LOCATION_GUIDE.md - Understanding node_modules
- 🎓 MOVING_TO_CLAUDE_CODE.md - Guide for using Claude Code
- 🐙 GITHUB_SETUP_GUIDE.md - Complete GitHub setup tutorial

## [0.2.0] - 2026-02-20

### Added
- 🎬 Initial dual-platform support
- 🎨 Theme customization system
- 📊 Event deduplication
- 🌐 Cross-platform compatibility

### Changed
- Complete rewrite from v1.x
- Modern architecture

## [0.1.0] - 2026-02-15

### Added
- Initial release
- Basic Chaturbate support
- Simple scene switching
- Basic overlay

---

## Version Format

**[MAJOR.MINOR.PATCH]**

- **MAJOR:** Breaking changes, major features
- **MINOR:** New features, backwards compatible
- **PATCH:** Bug fixes, small improvements

---

## Categories

- **Added:** New features
- **Changed:** Changes to existing features
- **Deprecated:** Soon-to-be removed features
- **Removed:** Removed features
- **Fixed:** Bug fixes
- **Security:** Security improvements
- **Documentation:** Documentation changes
- **Improved:** Performance/quality improvements
