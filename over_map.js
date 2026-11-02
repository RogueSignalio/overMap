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
      launch_icon: 'zoom_in.png',
      reset_icon: 'zoom_out.png',
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
          // console.log('svge_up ' + window.pz_click_up_abort)
          if (!window.pz_click_up_abort) action[1](this.id)
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

}

