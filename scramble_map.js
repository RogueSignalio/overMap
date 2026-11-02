/*===========================================================================
Authors: BlackRogue01
Copyright: RogueSignal.io, wwww.roguesignal.io, 2026
===========================================================================*/
class ScrambleMap {
  constructor(parent,task_group,task_map,cfg={}) {
    this.cfg = {
      launch_mode: 'icon',
      global_look_around_max: 2,
      look_around: true,
      panzoom_height: 600,
      ...cfg
    }
    this.parent_id = parent
    this.parent = document.getElementById(parent)
    // this.task_group = task_group
    // this.task_map = task_map
    this.task_elements = []
    this.task_svgs = []
    this.task_actions = []
    this.background = task_group.pan_asset_url ? task_group.pan_asset_url : task_group.asset_url
console.log(this.background)
    for (const task of task_map) {
      if (task.embedded && task.embedded_svg) {
        this.task_elements.push(task)
        this.task_svgs.push(task.embedded_svg)
        if (task.list_display_type != "embedded_decal") {
          if (task.inline_view) {
            this.task_actions.push([task.uuid,SW.ui.simple_task])
          } else { 
            this.task_actions.push([task.uuid,SW.ui.open_task])
          }
        }
      }
    }

    this.overmap = new OverMap({
      parent: this.parent_id,
      background: this.background, 
      svg_base: task_group.embedded_svg,
      svg_elements: this.task_svgs,
      svg_actions: this.task_actions,
      ...this.cfg
    })

  }
}