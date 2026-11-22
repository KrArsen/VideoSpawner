## Videos made as code: VideoSpawner
- For a video, animation or film made as code, follow the `videospawner` skill. New films go in the films folder `hub_workspace` names.
- When a film plays: `hub_live({project: "<film folder>"})`, tell the user in one sentence (their language) to leave notes on the frames and press "Copy for Claude", then paste the prompt into this chat; end your turn.
- A pasted "VideoSpawner: N notes" prompt: open each picture, fix the code only, `hub_note_update` each. Render only when asked, through `hub_render`. Without MCP: `node "{{VIDEOSPAWNER_DIR}}/server/cli.js" <tool> "<json>"`.
