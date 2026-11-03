/*===========================================================================
Authors: BlackRogue01
Copyright: RogueSignal.io, wwww.roguesignal.io, 2026
===========================================================================*/
class OverMap {
  constructor (cfg={}) {
    this.cfg = {
      parent: null,
      asset_path: '/assets',
      background: 'example.jpg',
      svg_base: null,
      launch_mode: 'manual',
      launch_icon: null, //'zoom_in.png',
      reset_icon: null, //'zoom_out.png',
      shape_outline: 0,
      svg_view_box: null,
      svg_elements: [],
      svg_actions: [],
      panzoom_width:  null,
      panzoom_height: null,
      look_around: true,
      look_around_max: 0,
      global_look_around_max: null,
      ...cfg
    }
    this.parent = document.getElementById(this.cfg.parent)
    this.parent.style.userSelect = "none"
    if (!document.getElementById('panzoom_styles')) {
      const style = document.createElement('style');
      style.id = 'panzoom_styles';
      // style.type = 'text/css';
      style.textContent = `
        .panzoom_container {
            transition: height 0.4s ease-out, width 0.4s ease-out;
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
            /* Optional: handle overflow if image is larger than container */
            overflow: clip; 
        }
      `
      document.head.appendChild(style);
    }
    this.parent.classList.add('panzoom_container')
    let rect = this.parent.getBoundingClientRect()
    this.base_width = rect.width
    this.base_height = rect.height
    this.click_up_abort = false
    if (!this.cfg.launch_icon) this.cfg.launch_icon = this.zoom_in_png();
    if (!this.cfg.reset_icon) this.cfg.reset_icon = this.zoom_out_png();

    this.look_around_cnt = 0
    if (this.cfg.global_look_around_max) {
      this.cfg.look_around_max = this.cfg.global_look_around_max
      if (!window.pz_look_around_cnt) window.pz_look_around_cnt = 0;
    }
    this.staticMap()
  }

  staticMap() {
    this.parent.style.cursor = 'auto';
    let pz_e = this.htmlToNode(`<div id="${this.parent.id}-pz" style="visibility:hidden;min-width:${this.base_width}px;width:${this.base_width}px;height:${this.base_height}px;display: flex;" class="acontainer"></div>`);
    this.panzoom_elem = pz_e
    let pz_bckgr = this.htmlToNode(`<img id="${this.parent.id}-pz-bckgr" src="${this.cfg.background}" style="width:auto;height:100%;position: relative;"/>`)
    let pz_svg = null
    if (!this.cfg.svg_base) {
      pz_svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      if (!this.cfg.svg_view_box) {
        this.cfg.svg_view_box = `0 0 ${this.base_width} ${this.base_height}`
      }
      pz_svg.id = `${this.parent.id}-svg`
      pz_svg.setAttribute('id',`${this.parent.id}-svg`)
      pz_svg.setAttribute('xmlns',"http://www.w3.org/2000/svg")
      pz_svg.setAttribute('viewBox',this.cfg.svg_view_box)
    } else {
      pz_svg = this.htmlToNode(this.cfg.svg_base)      
      pz_svg.id = `${this.parent.id}-svg`
    }

    pz_svg.style.position = 'absolute'
    pz_svg.setAttribute('width', 'auto');
    pz_svg.setAttribute('height', '100%');

    pz_e.appendChild(pz_bckgr)
    pz_e.appendChild(pz_svg)
    this.parent.appendChild(pz_e);
    if (this.cfg.svg_elements.length == 0) {
    }
    for (const svg_el of this.cfg.svg_elements) {
      pz_svg.innerHTML += svg_el
    }
    let svgElements = document.querySelectorAll('svg *');
    svgElements.forEach(el => {
      el.setAttribute('stroke-width',0)
    });

    this.waitForAllImages().then(() => {
      // console.log('All images, including SVG images, are loaded.');
      this.panzoom_elem.style.visibility = 'visible'
      if (this.cfg.launch_mode == 'static') this.staticClickLaunch();
      else if (this.cfg.launch_mode == 'icon') this.iconClickLaunch();
    });   
  } 

  iconClickLaunch() {
    const icon_width = (this.base_width / 10) - 5
    const icon_height = (this.base_height / 10) - 5
    let pz_icon = this.htmlToNode(`
<image id="${this.parent.id}-pz-zoom" style="opacity:0.8;right:5px;top:5px;width:${icon_width}px;height:${icon_height}px;position:absolute;" src="${this.cfg.launch_icon}"/>`);
    this.launch_elem = pz_icon
    pz_icon.style.cursor = 'pointer';
    this.parent.appendChild(pz_icon)
    pz_icon.addEventListener('click', function(event) {
        this.panzoomMap()
        this.iconClickStatic()
    }.bind(this), { once: true });
  }

  iconClickStatic() {
    this.launch_elem.src = `${this.cfg.reset_icon}`
    this.launch_elem.style.cursor = 'pointer';

    this.launch_elem.addEventListener('click', function(event) {
        this.resetMap()
    }.bind(this), { once: true });
  }

  staticClickLaunch() {
    this.launch_elem = this.parent
    this.parent.addEventListener('click', function(event) {
        this.panzoomMap()
    }.bind(this), { once: true });
  }

  resetMap() {
    this.panzoom.destroy()
    const e = document.getElementById(`${this.parent.id}-pz`)
    e.remove()
    this.parent.style.height = `${this.base_height}px`
    this.parent.style.width = `${this.base_width}px`
    setTimeout(function() {
      this.staticMap()
    }.bind(this),400)
  }

  panzoomMap(width=this.cfg.panzoom_width,height=this.cfg.panzoom_height) {
    const elem = this.panzoom_elem 
    const panzoom_width = width ? width : this.base_width
    const panzoom_height = height ? height : this.base_height
    const zoom_x_offset = (this.base_width - panzoom_width) / 2
    const zoom_y_offset = (this.base_height - panzoom_height) / 2

    // let svgElements = document.querySelectorAll('svg *');
    // svgElements.forEach(el => {
    //   el.style.cursor = 'pointer';
    //   el.setAttribute('stroke-width',0)
    // });

    this.panzoom = Panzoom(elem,{
      maxScale: 10,
      minScale: 1,
      startScale: 1,
      // panOnlyWhenZoomed: true,
      contain: 'outside',
      excludeClass: 'panzoom-exclude',
      canvas: true,
      roundPixels: true,
      startX: 0,
      startY: 0,
    })

    this.panzoom_elem.addEventListener('wheel', this.panzoom.zoomWithWheel)
    this.panzoom_elem.addEventListener("panzoompan", (event) => {
      window.pz_click_up_abort = true
      // console.log('pzs ' + window.pz_click_up_abort)
    })

    for (const action of this.cfg.svg_actions) {
      const svg_el = document.getElementById(action[0])
      if (svg_el) {
        svg_el.style.cursor = 'pointer';
        svg_el.setAttribute('stroke-width',0)
        svg_el.addEventListener('pointerdown', function(event) {
          if ((event.pointerType === 'mouse' && event.button === 0) || (event.pointerType === 'touch')) {
            window.pz_click_up_abort = false
          }
        });
        svg_el.addEventListener('pointerup', function(event) {
          //console.log('svge_up ' + window.pz_click_up_abort)
          if (!window.pz_click_up_abort) {
          //console.log('svge_up ' + action[1].name + '("' + action[0] + '")')
            action[1](action[0])
          }
        });
      }
    }

    // elem.parentElement.style.pointerEvents = 'none';
    elem.parentElement.style.display = 'block'
    elem.parentElement.style.visibility = 'visible'

    if (height) {
      setTimeout(function() { elem.parentElement.style.height = `${height}px` },0)
    }
    if (width) {
      setTimeout(function() { elem.parentElement.style.width = `${width}px` },0)
    }
    // elem.parentElement.classList.add('expanded');
    // document.getElementById('group-static').style.visibility = 'collapse'
    // document.getElementById('group-static').style.display = 'none'

    let easing4 = 'linear(0, -0.022 6.2%, -0.114 17.8%, -0.141 22.5%, -0.146 27.3%, -0.119 31.7%, -0.036 37%, 0.107 42%, 0.301 46.5%, 0.819 56.1%, 0.976 60.6%, 1.08 65.3%, 1.137 70.5%, 1.147 73.3%, 1.145 76.2%, 1.119 81.6%, 1.02 94.1%, 1)'
    let easing3 = 'linear(0, 0.49 7.4%, 0.864 15.3%, 1.005 19.4%, 1.12 23.7%, 1.206 28.1%, 1.267 32.8%, 1.296 36.4%, 1.311 40.2%, 1.313 44.2%, 1.301 48.6%, 1.252 56.9%, 1.105 74.4%, 1.048 82.5%, 1.011 91.1%, 1)'
    let easing2 = 'linear(0, 0.009 1.4%, 0.032 2.8%, 0.131 6%, 0.265 9.1%, 0.675 17.6%, 0.88 22.8%, 0.953 25.2%, 1.014 27.7%, 1.062 30.3%, 1.094 32.9%, 1.121 37.2%, 1.121 42.2%, 1.102 46.7%, 1.019 61.2%, 0.989 71.5%, 0.985 81.1%, 1)'
    let easing = 'cubic-bezier(0.8, -0.4, 0.5, 1)'

    let movements = [
      // [-50,40,100,-60], [30,-30,-70,50], [-70,40,150,-60],
      // [20,30,-60,50], [65,-60,-125,-20], [-80,70,130,30],  
      [-130,70,250,-60], [120,-60,-200,70], [-100,40,260,-60],
      [140,60,-210,50], [140,-60,-180,-50], [-120,70,220,90],  
    ]
    let move_slot = Math.floor(Math.random() * movements.length)
    let move = movements[move_slot]
    let duration = 200

    if (this.cfg.global_look_around_max) this.look_around_cnt = window.pz_look_around_cnt

    if ((this.cfg.look_around) && ((this.cfg.look_around_max == 0) || (this.look_around_cnt < this.cfg.look_around_max))) {
        setTimeout(function() {
          this.panzoom.zoom(2.2, { focal: { x: zoom_x_offset, y: zoom_y_offset }, animate: true, duration: duration, easing: 'ease-out', relative: true }) 
          duration += 50
          setTimeout(function() { 
               this.panzoom.pan(move[0]/2, move[1]/2, { animate: true, duration: 900, relative: true, easing: easing3 });
          }.bind(this),duration)
          duration += 950
          setTimeout(function() { 
               this.panzoom.pan(move[2]/2, move[3]/2, { animate: true, duration: 900, relative: true, easing: easing2 });
          }.bind(this),duration)
          duration += 950
          setTimeout(function() { 
              this.panzoom.pan(0, 50, { animate: true, duration: 900, relative: false, easing: easing4 });
          }.bind(this),duration)
          duration += 950
          setTimeout(function() { elem.style.pointerEvents = 'auto'; }.bind(this),duration)
        }.bind(this),10)

        this.look_around_cnt++;
        if (this.cfg.global_look_around_max) window.pz_look_around_cnt++;

      } else {
        setTimeout(function() { 
          this.panzoom.zoom(2.2, { focal: { x: zoom_x_offset, y: zoom_y_offset }, animate: true, duration: duration, easing: 'ease-out', relative: true }) 
          duration += 50
          setTimeout(function() { elem.style.pointerEvents = 'auto'; }.bind(this),duration)          
        }.bind(this),10)
      }

  } 

  waitForAllImages() {
    // 1. Handle standard HTML <img> tags
    const htmlImages = Array.from(document.querySelectorAll('img'));
    const htmlPromises = htmlImages.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    });

    // 2. Handle SVG <image> tags
    const svgImages = Array.from(document.querySelectorAll('svg image'));
    // console.log('svgImages',svgImages)
    const svgPromises = svgImages.map(img => {
      // Check if already loaded
      var fake_img = new Image();
      fake_img.src = img.attributes['xlink:href'].nodeValue;

      if (fake_img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        // SVGImageElement uses 'load' event, not 'SVGLoad' in modern browsers
        // console.log('fake_img',fake_img)      
        //img.addEventListener('SVGLoad', resolve, { once: true });
        fake_img.addEventListener('load', resolve, { once: true });
        fake_img.addEventListener('error', resolve, { once: true });
        // Force reload if necessary (e.g., if src was set dynamically before listener)
        // Note: Only trigger if the image hasn't fired load yet
        if (fake_img.complete) {
          // console.log('done already!')
        }
        // if (!img.complete) {
        //   // Clone the node to force re-download if needed, or just rely on event
        //   // Often, simply attaching the listener is enough if src is already set
        // }
      });
    });

    // 3. Wait for all promises to settle
    return Promise.all([...htmlPromises, ...svgPromises]);
  }

  alert(message,backgroundColor="#fff") {
      // Create a custom alert container
      const alertBox = document.createElement('div');
      alertBox.style.color = '#000000';
      alertBox.style.position = 'fixed';
      alertBox.style.top = '50%';
      alertBox.style.left = '50%';
      alertBox.style.transform = 'translate(-50%, -50%)';
      alertBox.style.backgroundColor = backgroundColor;
      alertBox.style.border = '2px solid #000';
      alertBox.style.padding = '20px';
      alertBox.style.borderRadius = '8px';
      alertBox.style.boxShadow = '0 10px 10px rgba(0,0,0,0.3)';
      alertBox.style.zIndex = '10000';
      alertBox.style.maxWidth = '300px';
      alertBox.style.textAlign = 'center';

      // Add message
      const messageEl = document.createElement('p');
      messageEl.textContent = message;
      messageEl.style.marginBottom = '15px';

      // Add OK button
      const okBtn = document.createElement('button');
      okBtn.textContent = 'OK';
      okBtn.style.padding = '8px 16px';
      okBtn.style.backgroundColor = '#555555';
      okBtn.style.color = '#fff';
      okBtn.style.border = 'none';
      okBtn.style.borderRadius = '4px';
      okBtn.style.cursor = 'pointer';
      okBtn.onclick = () => {
          document.body.removeChild(alertBox);
      };

      // Append elements
      alertBox.appendChild(messageEl);
      alertBox.appendChild(okBtn);
      document.body.appendChild(alertBox);
  }

  htmlToNode(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
  }

  zoom_in_png() {
    return "data:image/png;base64,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"
  }
  zoom_out_png() {
    return "data:image/png;base64,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"
  }

}

