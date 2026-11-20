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
      simple_task_func: function(id,coords) { console.log('Simple Task:' + id) },
      open_task_func: function(id,coords) { console.log('Open Task:' + id) },
      ...cfg
    }
    this.parent_id = parent
    this.parent = document.getElementById(parent)
    this.parent.addEventListener('contextmenu', event => event.preventDefault());
    this.task_group = task_group
    this.task_map = task_map

    this.populate()
    this.create()
  }

  populate() {
    this.task_elements = []
    this.task_svgs = []
    this.task_actions = []

    // this.background = this.task_group.asset_url // this.task_group.pan_asset_url ? this.task_group.pan_asset_url : this.task_group.asset_url
    this.background = this.task_group.pan_asset_url ? this.task_group.pan_asset_url : this.task_group.asset_url
    //this.panzoom_background = this.task_group.pan_asset_url ? this.task_group.pan_asset_url : this.task_group.asset_url
    console.log(this.panzoom_background)
    for (const task of this.task_map) {
      if (task.embedded && task.embedded_svg) {
        this.task_elements.push(task)
        this.task_svgs.push(task.embedded_svg)
        if (task.list_display_type != "embedded_decal") {
          if (task.inline_view) {
            this.task_actions.push([task.uuid,this.cfg.simple_task_func]) //SW.ui.simple_task_id])
          } else { 
            this.task_actions.push([task.uuid,this.cfg.open_task_func]) //SW.ui.open_task_id])
          }
        }
      }
    }
  }

  update(task_group,task_map) {
    this.task_group = task_group ? task_group : this.task_group
    this.task_map = task_map ? task_map : this.task_map
    // this.destroy()   
    setTimeout(function() {
      this.populate()
      this.recreate()    
      this.resetMap()
    }.bind(this),50)
  }

  recreate() {
    this.overmap.cfg = {
      ...this.overmap.cfg,
      svg_base: this.task_group.embedded_svg,
      svg_elements: this.task_svgs,
      svg_actions: this.task_actions,      
    }
  }

  create() {
    this.overmap = new OverMap({
      parent: this.parent_id,
      background: this.background, 
      // panzoom_background: this.panzoom_background, 
      svg_base: this.task_group.embedded_svg,
      svg_elements: this.task_svgs,
      svg_actions: this.task_actions,
      ...this.cfg
    })
  }

  destroy() {
    this.overmap.destroy()
    this.overmap = null    
  }

  resetMap() {
    this.overmap.resetMap()    
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
      parent.scrollIntoView({ behavior: 'smooth', block: 'start' });
      SW.last_panzoom = new ScrambleMap(parent.id,data,data.tasks,{ 
        panzoom_fullscreen: true,
        look_around_random: 15,
        simple_task_func: SW.ui.open_task_id,
        open_task_func: SW.ui.open_task_id,
      })
      let img = document.querySelector(`#${group_uuid} .landscape-group-icon-cont .landscape-group-icon`);
      img.remove();
  })
}
