---
'deepsource-mcp-server': patch
---

chore: replace local changelog generator with @sapientpants/changelog-github-custom package

- Removed custom changelog implementation in favor of the community package
- Updated changeset config to use @sapientpants/changelog-github-custom
- Added @sapientpants/changelog-github-custom as a dev dependency
- Simplified maintenance by using an established solution
