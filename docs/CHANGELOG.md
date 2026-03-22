# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2026-03-22

### Fixed
- Auto-updater no longer fails with HTTP 404 when CHANGELOG.md is not present at the repo root
- Command window now stays open after server stops on Windows, so the log can be read before closing
- Console now shows which scene is triggered when a tip matches a configured scene trigger

---

## [1.1.1] - 2026-03-19

### Added
- Auto-install of Node.js on Windows when starting the server for the first time, matching the existing Mac behavior

### Fixed
- Ticker transparency rendering issue
- Apply to OBS button now correctly glows when activating/deactivating triggers and when reordering them

### Changed
- Supplemental files (CHANGELOG, CONFIG_GUIDE, config.example.json, release script, screenshots) moved into a `Supplement files/` folder for a cleaner project root
- `last_applied_config.json` removed from git tracking

### Documentation
- README updated with more information and clearer setup instructions

---

## [1.1.0] - 2026-03-14

### Added
- ⏳ **Scene Switch Delay Progress Bar** - A shrinking progress bar now appears at the bottom of the tip popup during the scene switch delay, giving viewers a visual countdown before the scene changes
  - Respects the existing Progress Bar Enabled/Disabled theme setting
  - Matches the popup's border radius and uses the same gradient and glow as the return bar
  - Shimmer effect applies if shimmer is enabled in the theme
  - Visible in the editor preview with a looping countdown animation
- 🔄 **Auto-Update** - When a newer version is detected at startup, the server now prompts to download and apply the update automatically
  - Downloads source files directly from the GitHub release tag — no zip extraction needed
  - Preserves `config.json` and `last_applied_config.json` (user data is never overwritten)
  - Restores execute permissions on `START_SERVER_MAC.command` after updating
  - Falls back gracefully with a manual download link if the update fails

### Fixed
- 🕐 **Popup Duration with Long Switch Delays** - When the scene switch delay exceeds the standard alert display time, the popup now stays visible for the full delay duration instead of disappearing early
- 🔁 **Ticker Separator at Loop Point** - The tip menu ticker now shows the separator before the first entry so the repeating loop has a visible divider at the wrap-around point

---

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
