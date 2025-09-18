---
'deepsource-mcp-server': patch
---

fix: remove redundant client-side filtering in quality metrics handler

The quality metrics handler was unnecessarily filtering metrics on the client side
after the GraphQL API had already applied the same filters on the server side.
This change removes the redundant filtering by using the repository's
findByProjectWithFilter method when shortcode filters are specified.
