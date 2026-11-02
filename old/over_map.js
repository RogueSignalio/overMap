class OverMap {
  constructor(options={}) {
    this.options = {
      width: 500,
      height: 500,
      parent: 'overmap',
      background_image: null,      
      images: [],     
      ...options
    }
    this.width = this.options.width;
    this.height = this.options.height;
    this.parent_id = this.options.parent;

    this.parent_elem = document.getElementById( this.parent_id );
    if (this.parent_elem == null) {
      this.parent_elem = document.createElement("div");
      this.parent_elem.id = this.parent_id;
      document.body.appendChild(this.parent_elem);
    }
    // this.parent_elem.style.position = 'relative';
    // this.parent_elem.style.width = this.options.width + 'px'
    // this.parent_elem.style.height = this.options.height + 'px'
    // this.parent_elem.style.backgroundSize = 'cover'
    // this.parent_elem.style.backgroundImage = `url('${this.options.map_image}')`;
    // this.parent_elem.style.border = '1px solid #ccc'
    // this.parent_elem.style.overflow = 'hidden'

    // this.drawGUI()
    waitForAllImages().then(() => {

    })
  }
}

function waitForAllImages() {
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
console.log('svgImages',svgImages)
  const svgPromises = svgImages.map(img => {
    // Check if already loaded
    var fake_img = new Image();
    fake_img.src = img.attributes['xlink:href'].nodeValue;

    if (fake_img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      // SVGImageElement uses 'load' event, not 'SVGLoad' in modern browsers
      console.log('fake_img',fake_img)      
      //img.addEventListener('SVGLoad', resolve, { once: true });
      fake_img.addEventListener('load', resolve, { once: true });
      fake_img.addEventListener('error', resolve, { once: true });
      // Force reload if necessary (e.g., if src was set dynamically before listener)
      // Note: Only trigger if the image hasn't fired load yet
      if (fake_img.complete) {
        console.log('done already!')
      }
      // if (!img.complete) {
      //   // Clone the node to force re-download if needed, or just rely on event
      //   // Often, simply attaching the listener is enough if src is already set
      // }
    });
  });

  // 3. Wait for all promises to settle
  console.log('hmmm')
// svgImages.map(img => {
//   console.log(img)
// })
  return Promise.all([...htmlPromises, ...svgPromises]);
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
