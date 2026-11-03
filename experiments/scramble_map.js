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
      simple_task_func: function(id) { console.log('Simple Task:' + id) }
      open_task_func: function(id) { console.log('Open Task:' + id) }
      ...cfg
    }
    this.parent_id = parent
    this.parent = document.getElementById(parent)
    this.parent.addEventListener('contextmenu', event => event.preventDefault());
    // this.task_group = task_group
    // this.task_map = task_map
    this.task_elements = []
    this.task_svgs = []
    this.task_actions = []
    this.background = task_group.pan_asset_url ? task_group.pan_asset_url : task_group.asset_url
    for (const task of task_map) {
      if (task.embedded && task.embedded_svg) {
        this.task_elements.push(task)
        this.task_svgs.push(task.embedded_svg)
        if (task.list_display_type != "embedded_decal") {
          if (task.inline_view) {
            this.task_actions.push([task.uuid,simple_task_func]) //SW.ui.simple_task_id])
          } else { 
            this.task_actions.push([task.uuid,open_task_func]) //SW.ui.open_task_id])
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

function scramble_load_panzoom(group_uuid) {
  // let top = document.querySelector(`#${group_uuid}`);
  // let clone = top.cloneNode(true);
  // top.replaceWith(clone);

  let parent =  document.querySelector(`#${group_uuid} .landscape-group-icon-cont`);
  parent.id = `${group_uuid}_image`

  SW.last_panzoom = null
  SW.player_panzoom_map(group_uuid,function(data){
      SW.last_panzoom = new ScrambleMap(clone.id,data,data.tasks,{ 
        panzoom_height: 450,
        simple_task_func: SW.ui.open_task_id,
        open_task_func: SW.ui.open_task_id,
      })
      let img = document.querySelector(`#${group_uuid} .landscape-group-icon-cont .landscape-group-icon`);
      img.remove();
  })
}
