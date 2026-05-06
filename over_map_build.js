class OverMapBuild {
  constructor(options={}) {
    this.options = {
      width: 500,
      height: 500,
      parent: 'overmap',
      gui_parent: 'overmap_gui',
      svg_parent: 'overmap_svg',
      map_image: null,      
      draw_params: {
        'stroke-width': 2,
        stroke: "#FFFF00",
        fill: '#00000001',
      },     
      ...options
    }
    this.width = this.options.width;
    this.height = this.options.height;
    this.parent_id = this.options.parent;
    window.selected = null
    this.parent_elem = document.getElementById( this.parent_id );
    if (this.parent_elem == null) {
      this.parent_elem = document.createElement("div");
      this.parent_elem.id = this.parent_id;
      document.body.appendChild(this.parent_elem);
    }
    this.parent_elem.style.position = 'relative';
    this.parent_elem.style.width = this.options.width + 'px'
    this.parent_elem.style.height = this.options.height + 'px'
    this.parent_elem.style.backgroundSize = 'cover'
    this.parent_elem.style.backgroundImage = `url('${this.options.map_image}')`;
    this.parent_elem.style.border = '1px solid #ccc'
    this.parent_elem.style.overflow = 'hidden'
    this.parent_elem.addEventListener('contextmenu', function(event) {
      event.preventDefault();
    });


    this.gui_parent_id = this.options.gui_parent;
    this.gui_parent_elem = document.getElementById( this.gui_parent_id );
    if (this.gui_parent_elem == null) {
      this.gui_parent_elem = document.createElement("div");
      this.gui_parent_elem.id = this.gui_parent_id;
      document.body.appendChild(this.gui_parent_elem);
    }
    this.gui = new lil.GUI( { container: this.gui_parent_elem, width: 350 } );
    this.svg_canvas = new SVG()
    this.svg_canvas.viewbox(0,0,this.options.width,this.options.height)
    this.svg_elem = this.svg_canvas.addTo('#' + this.parent_id).size(this.width, this.height)
    let self = this
    this.svg_elem.mousedown(function(e) { 
      self.off_selected();
    })
    this.svg_elem.addEventListener('contextmenu', function(event) {
      event.preventDefault();
    });
    this.draw_params = this.options.draw_params

    this.objects = {}
    this.objects_by_name = {}
    this.object_list = []
    this.object_name_list = []
    this.current_object = {}
    this.name_list = null
    this.id_list = null

    this.filters_map = {
      blur: [0,0,10,1],
      brightness: [1.0,0,10.0,0.1],
      contrast: [1.0,0,10.0,0.1],
      grayscale: [0.0,0,1,0.1],
      opacity: [1.0,0.1,1.0,0.1],
      saturate: [1.0,0,10,0.1],
      sepia: [0.0,0,1.0,0.1],
      drop_shadow_on: [false],
      drop_shadow_h: [0,-10,10,1],
      drop_shadow_v: [0,-10,10,1],
      drop_shadow_blur: [0,0,20,0.5],
      drop_shadow_color: ['#000000'],
    }

    this.drawGUI()
  }

  getObject(id) {
    return this.objects[id]
  }

  getObjectSave(id) {
    return this.objects[id].options
  }

  getObjectElement(id) {
    return this.objects[id].svg.node
  }

  getSVG() {
    this.off_selected()
    return this.svg_canvas.svg()
  }

  drawGUI() {
    let filter_hash = {}
    for (const filter of Object.keys(this.filters_map)) {
      filter_hash[filter] = this.filters_map[filter][0]
    }

    this.current_object = {
      coords: '',
      name: '',
      id: '', 
      shape: '',
      type: '',
      filters: filter_hash,
    }

    let self = this
    let ctrls = {
      polygon: function(e) { self.replaceCurrentShape('polygon') },
      ellipse: function(e) { self.replaceCurrentShape('ellipse') },
      rectangle: function(e) { self.replaceCurrentShape('rect') },
    }
    let gui = this.gui
    this.id_list = gui.add( this.current_object, 'id',this.object_list ).listen();
    this.id_list.onFinishChange( function( v ) {
      self.on_selected(v)
    });
    this.name_list = gui.add( this.current_object, 'name',this.object_list ).listen();
    this.name_list.onFinishChange( function( v ) {
      let obj = self.objects_by_name[v]
      self.on_selected(obj.id)
    });

    gui.main = gui.addFolder( 'Main' );
    gui.main.add( this.current_object, 'id' ).listen();
    gui.main.add( this.current_object, 'name' ).listen();
    gui.main.add( this.current_object, 'shape' ).listen();
    gui.main.add( this.current_object, 'coords' ).listen();
    gui.main.add( this.current_object, 'type').listen();    
    gui.filters = gui.addFolder( 'Filters' );

    for (const filter of Object.keys(this.current_object.filters)) {
      let fmap = this.filters_map[filter]
      let fcon = null
      if (filter.match(/color/g)) {
        fcon = gui.filters.addColor( this.current_object.filters, filter).listen() ;        
      } else if (filter.match(/_on/g)) {
        fcon = gui.filters.add( this.current_object.filters, filter).listen() ;
      } else {
        fcon = gui.filters.add( this.current_object.filters, filter,fmap[1],fmap[2],fmap[3]).listen() ;
      }
      let self = this
      fcon.onChange( function( v ) {
        self.updateFilter(self.current_object.id,this._name,v)
      });
    }
    gui.filters.hide();

    gui.conversion = gui.addFolder( 'Conversion' );
    gui.conversion.add( ctrls, 'rectangle' );   // text field
    gui.conversion.add( ctrls, 'ellipse' );   // text field
    gui.conversion.add( ctrls, 'polygon' );   // text field
    gui.conversion.hide();

  }

  updateGUI(id) {
    let obj = this.objects[id]
    this.current_object.coords = JSON.stringify(obj.options.coords)
    this.current_object.name = obj.name
    this.current_object.id = obj.id
    this.current_object.shape = obj.options.shape
    this.current_object.type = obj.type
    for (const filter of Object.keys(this.current_object.filters)) {
        this.current_object.filters[filter] = obj.options.filters[filter] != undefined ?
            obj.options.filters[filter] :  this.filters_map[filter][0]
    }
    if (obj.type == 'shape') {
      this.gui.conversion.show();
      this.gui.filters.hide();
    } else {
      this.gui.conversion.hide();
      this.gui.filters.show();
    }
  }

  off_selected() {
    if (window.selected != null) {
      window.selected.resize(false);
      window.selected.select(false);
      if (window.selected.type == "polygon") { window.selected.pointSelect(false); }
      window.selected = null
    }
  }

  on_selected(id) {
    let t = this.objects[id].svg
    if (window.selected != t) {
      this.off_selected()
      window.selected = t
      t.front()
      t.select({
        createHandle: (group) => group.rect(6, 6).css({ fill: "red" }),
        updateHandle: (shape, p) => shape.center(p[0], p[1]),
      }).resize(t.resize_params ? t.resize_params : {}); 
      t.on("resize", (event) => {
        console.log(event.detail);
        if (event.detail.event.type == "mouseup") {
          this.updateCoords(id)
          this.updateGUI(id)
        }
        if (event.detail.eventType == "rot") {
          this.updateCoords(id)
        }
      });    

      if (t.type == "polygon") { 
        t.pointSelect({
          createHandle: (group) => group.circle(6).css({ fill: "blue" }),
          updateHandle: (shape, p) => shape.center(p[0], p[1]),
        }); 
      }
    }
    this.updateCoords(id)
    this.updateGUI(id)
  }

  updateIDOptions(id) {
    this.object_list.push(id)
    this.id_list.options(this.object_list)
  }

  updateNameOptions(name) {
    this.object_name_list.push(name)
    this.name_list.options(this.object_name_list)
  }

  updateFilter(id,filter,value) {
    let obj = this.objects[id].options.filters
    obj[filter] = value
    this.setFilters(id)
  }

  setFilters(id) {
    let filtersCombined = []
    let obj = this.objects[id].options.filters
    let shadow = {}

    for (const key of Object.keys(obj)) {
      let value = obj[key]
      if (!key.match(/shadow/g)) {
        if (key == 'blur') { value = value + 'px'; }
        filtersCombined.push(`${key}(${value})`)
      } else {
        let shadow_key = key.split('_').pop()
        shadow[shadow_key] = value
      }
    }
    if (shadow['on'] == true) {
      let shadow_map = {
        h: 0,
        v: 0,
        blur: 0,
        spread: 0,
        color: '#000000',
        ...shadow,
      }
      let shadow_filter = `drop-shadow(${shadow_map['h']}px ${shadow_map['v']}px ${shadow_map['blur']}px ${shadow_map['color']})`
      filtersCombined.push(shadow_filter)
    }
    this.objects[id].svg.node.style.filter = filtersCombined.join(' ')
  }

  setTransforms(id) {
    let transformsCombined = []
    let obj = this.objects[id].options.transforms ? this.objects[id].options.transforms : {}
    let h = { } //origin: {x: 50, y: 50} }
    for (const key of Object.keys(obj)) {
      let value = obj[key]
      h[key]=value
    }
    this.objects[id].svg.transform(h)
  }

  addEmbedImage(id,name,url,options,onclick=function(){}) {
    let obj = {}
    this.updateIDOptions(id)
    this.updateNameOptions(name)
    this.objects[id] = obj
    this.objects_by_name[name] = this.objects[id]
    obj.type = 'image'
    obj.src = url;
    obj.id = id;
    obj.name = name;
    obj.options = {
      shape: 'image',
      coords: { x:10, y:10 },
      filters: { },
      ...options
    }

    obj.svg = this.svg_canvas.image(obj.src)
    obj.svg.attr(
      obj.options.coords
    )
    obj.svg.attr({ id: id })
    obj.svg.attr({ name: name })

    obj.svg.resize_params = {
      preserveAspectRatio: true,
      aroundCenter: true,
      grid: 2,
      degree: 0.1,
    }
    obj.svg.draggable().on('dragend', (e) => {
      self.updateCoords(id)
      self.updateGUI(id)
    })
    let self = this
    obj.svg.mousedown(function(e) { 
      self.on_selected(id); 
    })
    obj.svg.on('load', function (e) {
      // this is the loading event for the svg image
      // transforms are being super annoying...
      setTimeout(function() { self.setTransforms(id); },1)
      self.setFilters(id)
    })
  }

  addEmbedShape(id,name,options,onclick=function(){}) {
    let obj = {}
    this.updateIDOptions(id)
    this.updateNameOptions(name)
    this.objects[id] = obj
    this.objects_by_name[name] = this.objects[id]

    obj.options = {
      shape: 'rect',
      coords: { x:10, y:10, width: 30, height: 30 },
      filters: { },
      ...options
    };
    obj.id = id;
    obj.name = name;
    obj.type = 'shape';
    if (obj.options.shape == 'polygon') {
      if (obj.options.coords.points) {
        obj.svg = this.svg_canvas.polygon(obj.options.coords.points)
      } else {
        obj.svg = this.svg_canvas.polygon(obj.options.coords)        
      }
    } else if (obj.options.shape == 'ellipse') {
      obj.svg = this.svg_canvas.ellipse(obj.options.coords)
    } else {
      obj.svg = this.svg_canvas.rect(obj.options.coords)
    }
    obj.svg.attr(this.draw_params)
    obj.svg.attr({ id: id })
    obj.svg.attr({ name: name })

    this.setTransforms(id)
    this.setFilters(id)
    obj.svg.draggable()
    let self = this
    obj.svg.draggable().on('dragend', (e) => {
      self.updateCoords(id)
      self.updateGUI(id)
    })
    obj.svg.mousedown(function(e) { self.on_selected(id); })
  }

  addEmbedButton(id,name,text,options,onclick=function(){}) {
    this.updateNameOptions(id)
    this.objects[id].options = {
      // shape: 'rect',
      coords: { x:10, y:10 }, //, width: 10, height: 10 },
      filters: { },
      ...options
    };
    this.objects[id].text = text;
    this.objects[id].id = id;
    this.objects[id].svg = this.svg_canvas.rect(this.objects[id].options.coords)
    this.objects[id].svg.attr(this.draw_params)
    this.objects[id].svg.attr({ id: id })
    this.setFilters(id)
    this.objects[id].svg.draggable()
    let self = this
    this.objects[id].svg.mousedown(function(e) { self.on_selected(id); })
  }

  updateCoords(id) {
    let obj = this.objects[id]
    let shape = obj.options.shape
    if (!obj.options.transforms) { obj.options.transforms = {} }

    if (shape == 'polygon') {
      obj.options.coords.points = obj.svg.array().map(innerArray => 
          innerArray.map(value => Math.round(value))
      );
      obj.options.transforms = Math.round(obj.svg.transform('rotate'))

    } else if (shape == 'ellipse') {
      obj.options.coords = {
        cx: Math.round(obj.svg.cx()),
        cy: Math.round(obj.svg.cy()),
        rx: Math.round(obj.svg.rx()),
        ry: Math.round(obj.svg.ry()),
      }
      obj.options.transforms = Math.round(obj.svg.transform('rotate'))

    } else if (shape == 'image') {
      obj.options.coords = {
        x: Math.round(obj.svg.x()),
        y: Math.round(obj.svg.y()),
        width: Math.round(obj.svg.width()),
        height: Math.round(obj.svg.height()),
      }
      obj.options.transforms = obj.svg.transform() // Math.round(obj.svg.transform('rotate'))
    } else {
      obj.options.coords = {
        x: Math.round(obj.svg.x()),
        y: Math.round(obj.svg.y()),
        width: Math.round(obj.svg.width()),
        height: Math.round(obj.svg.height()),
      }
      obj.options.transforms = Math.round(obj.svg.transform('rotate'))
    }
  }

  replaceCurrentShape(shape) {
    this.replaceShape(this.current_object['id'],shape)
  }

  replaceShape(id,shape) {
    let obj = this.objects[id]
    this.off_selected()
    obj.svg.remove()
    if (shape == 'polygon') {
      obj.svg = this.startPolygon()
    } else if (shape == 'ellipse') {
      obj.svg = this.startEllipse()
    } else {
      obj.svg = this.startRectangle()
    }
    obj.svg.attr({ id: id })
    obj.options.shape = shape

    let self = this
    obj.svg.on('drawdone', function(event){
      self.updateCoords(id)
      self.setFilters(id)
    });
    obj.svg.draggable().on('dragend', (e) => {
      self.updateCoords(id)
    })
    obj.svg.mousedown(function(e) { self.on_selected(id); })
  }

  startRectangle() {
    this.off_selected()
    let c = this.svg_canvas.rect(this.draw_params).draw();
    c.draggable()
    return c
  }

  startEllipse() {
    this.off_selected()
    let c = this.svg_canvas.ellipse(this.draw_params).draw();
    c.draggable()
    return c
  }

  startPolygon() {
    this.off_selected()
    let c = this.svg_canvas.polygon(this.draw_params).draw();
    c.on('drawstart', function(e){
      document.addEventListener('mousedown', (event) => {
        if (event.button === 2) {
          c.draw('done');
          c.off('drawstart');
        }
      });
      document.addEventListener('keydown', function(e){
        if(e.keyCode == 13){
          c.draw('done');
          c.off('drawstart');
        }
      });
    });
    c.on('drawstop', function(){
      // remove listener
    });
    c.draggable()
    return c
  }
}

function omap_insert_script(id,file,onload=()=>{ }) {
  if (!this.loaded_js) { this.loaded_js = {} }
  if (this.loaded_js[id]) {
    onload.call(this)
  } else {
    let script = document.createElement('script');
    script.id = id
    script.src = file
    document.body.append(script);
    script.onload = ()=> { 
      this.loaded_js[id] = true; 
      onload.call(this);  
      console.log(`${file} loaded.`); 
    }
  }
}
