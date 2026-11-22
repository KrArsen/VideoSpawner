## Videos made as code: VideoSpawner
- For a video, animation or film made as code, follow the `videospawner` skill. New films go in the films folder `hub_workspace` names.
- When a film plays: `hub_live({project: "<film folder>"})`, tell the user in one sentence (their language) to leave notes and press "Send to agent", then call `hub_wait` instead of ending your turn.
- Fix notes in code only, `hub_note_update` each, `hub_wait` again. Render only when asked, through `hub_render`. Without MCP: `node "{{VIDEOSPAWNER_DIR}}/server/cli.js" <tool> "<json>"`.
