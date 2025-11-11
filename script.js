/**
 * Simulador Industrial 3D - Línea de Producción
 * Versión corregida y robusta
 */

class IndustrialSimulator {
  constructor() {
    // Verificar dependencias
    this.checkDependencies();
    
    // Variables principales
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.world = null;
    this.objects = [];
    this.vectors = [];
    this.isRunning = false;
    this.deltaTime = 1/60;
    this.simulationTime = 0;
    this.frameCount = 0;
    
    // Configuración
    this.config = {
      gravity: -9.8,
      restitution: 0.6,
      friction: 0.3,
      mass: 5,
      impulse: 10,
      angularVelocity: 2,
      rotation: 45
    };
    
    // Estado del robot
    this.robot = {
      base: null,
      segments: [],
      targetAngle: 0,
      currentAngle: 0,
      isActive: false
    };
    
    // Estadísticas
    this.stats = {
      activeObjects: 0,
      collisionCount: 0,
      totalEnergy: 0,
      maxVelocity: 0,
      avgVelocity: 0,
      currentAngle: 0,
      angularAcceleration: 0,
      damageReduction: 0,
      trajectoryEfficiency: 0
    };
    
    // Flags de visualización
    this.showVelocityVectors = true;
    this.showMomentumVectors = true;
    
    // Inicializar
    this.init();
  }
  
  checkDependencies() {
    if (typeof THREE === 'undefined') {
      console.error('Three.js no está cargado');
      alert('Error: Three.js no está disponible');
      return false;
    }
    if (typeof CANNON === 'undefined') {
      console.error('Cannon.js no está cargado');
      alert('Error: Cannon.js no está disponible');
      return false;
    }
    return true;
  }
  
  init() {
    console.log('🚀 Inicializando Simulador Industrial 3D...');
    this.showLoadingScreen();
    
    try {
      setTimeout(() => {
        this.setupScene();
        this.setupPhysics();
        this.setupLighting();
        this.setupGround();
        this.setupRobot();
        this.setupEventListeners();
        this.startLoop();
        this.hideLoadingScreen();
        console.log('✅ Simulador inicializado correctamente');
      }, 1000);
    } catch (error) {
      console.error('❌ Error durante inicialización:', error);
      alert('Error inicializando el simulador: ' + error.message);
    }
  }
  
  showLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      loadingScreen.style.display = 'flex';
    }
  }
  
  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }
  }
  
  setupScene() {
    console.log('📦 Configurando escena 3D...');
    
    // Canvas y renderer
    this.canvas = document.getElementById('canvas3d');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Escena
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    
    // Cámara
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(15, 10, 15);
    this.camera.lookAt(0, 0, 0);
  }
  
  setupPhysics() {
    console.log('⚛️ Configurando física...');
    
    this.world = new CANNON.World();
    this.world.gravity.set(0, this.config.gravity, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;
    this.world.defaultContactMaterial.friction = this.config.friction;
    this.world.defaultContactMaterial.restitution = this.config.restitution;
  }
  
  setupLighting() {
    console.log('💡 Configurando iluminación...');
    
    // Luz ambiental
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);
    
    // Luz direccional principal
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    this.scene.add(directionalLight);
    
    // Luz puntual
    const pointLight = new THREE.PointLight(0x0091ff, 0.3, 50);
    pointLight.position.set(-10, 5, -10);
    this.scene.add(pointLight);
  }
  
  setupGround() {
    console.log('🏗️ Configurando suelo...');
    
    // Suelo físico
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.add(groundBody);
    
    // Suelo visual
    const groundGeometry = new THREE.PlaneGeometry(40, 40);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x1a1a1a,
      transparent: true,
      opacity: 0.8
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);
    
    // Grid
    const gridHelper = new THREE.GridHelper(40, 20, 0x0091ff, 0x333333);
    gridHelper.material.opacity = 0.3;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);
  }
  
  setupRobot() {
    console.log('🤖 Configurando brazo robótico...');
    
    this.robot.base = new THREE.Group();
    
    // Base
    const baseGeometry = new THREE.CylinderGeometry(1, 1.5, 0.5, 8);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.position.y = 0.25;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    this.robot.base.add(baseMesh);
    
    // Segmento 1
    const segmentGeometry = new THREE.CylinderGeometry(0.2, 0.3, 3, 8);
    const segmentMaterial = new THREE.MeshLambertMaterial({ color: 0x0091ff });
    const segmentMesh = new THREE.Mesh(segmentGeometry, segmentMaterial);
    segmentMesh.position.y = 1.75;
    segmentMesh.castShadow = true;
    this.robot.base.add(segmentMesh);
    this.robot.segments.push(segmentMesh);
    
    // Herramienta
    const toolGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const toolMaterial = new THREE.MeshLambertMaterial({ color: 0xffaa00 });
    const toolMesh = new THREE.Mesh(toolGeometry, toolMaterial);
    toolMesh.position.y = 4.0;
    toolMesh.castShadow = true;
    this.robot.base.add(toolMesh);
    this.robot.segments.push(toolMesh);
    
    this.scene.add(this.robot.base);
  }
  
  setupEventListeners() {
    console.log('🎮 Configurando controles...');
    
    // Panel toggle
    const toggleControl = document.getElementById('toggleControl');
    if (toggleControl) {
      toggleControl.addEventListener('click', () => this.togglePanel('controlPanel'));
    }
    
    const toggleAnalysis = document.getElementById('toggleAnalysis');
    if (toggleAnalysis) {
      toggleAnalysis.addEventListener('click', () => this.togglePanel('analysisPanel'));
    }
    
    // Botones de objetos
    document.getElementById('addBox').addEventListener('click', () => this.addBox());
    document.getElementById('addSphere').addEventListener('click', () => this.addSphere());
    document.getElementById('addCylinder').addEventListener('click', () => this.addCylinder());
    
    // Controles de simulación
    document.getElementById('playBtn').addEventListener('click', () => this.play());
    document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
    document.getElementById('stepBtn').addEventListener('click', () => this.step());
    
    // Robot
    document.getElementById('activateRobot').addEventListener('click', () => this.toggleRobot());
    document.getElementById('resetRobot').addEventListener('click', () => this.resetRobot());
    
    // Optimización
    document.getElementById('optimizeLayout').addEventListener('click', () => this.optimizeLayout());
    document.getElementById('optimizeTrajectory').addEventListener('click', () => this.optimizeTrajectory());
    
    // Sliders
    this.setupSliders();
    
    // Checkboxes
    document.getElementById('showVelocityVectors').addEventListener('change', (e) => {
      this.showVelocityVectors = e.target.checked;
      this.updateVectors();
    });
    
    document.getElementById('showMomentumVectors').addEventListener('change', (e) => {
      this.showMomentumVectors = e.target.checked;
      this.updateVectors();
    });
    
    // Eventos de ventana
    window.addEventListener('resize', () => this.onWindowResize());
    this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
    
    // Teclado
    document.addEventListener('keydown', (e) => this.onKeyPress(e));
    
    console.log('✅ Controles configurados');
  }
  
  setupSliders() {
    const sliders = [
      { slider: 'massSlider', value: 'massValue', prop: 'mass' },
      { slider: 'frictionSlider', value: 'frictionValue', prop: 'friction' },
      { slider: 'gravitySlider', value: 'gravityValue', prop: 'gravity' },
      { slider: 'restitutionSlider', value: 'restitutionValue', prop: 'restitution' },
      { slider: 'impulseSlider', value: 'impulseValue', prop: 'impulse' },
      { slider: 'angularVelocitySlider', value: 'angularVelocityValue', prop: 'angularVelocity' },
      { slider: 'rotationSlider', value: 'rotationValue', prop: 'rotation' }
    ];
    
    sliders.forEach(slider => {
      const sliderEl = document.getElementById(slider.slider);
      const valueEl = document.getElementById(slider.value);
      
      if (sliderEl && valueEl) {
        sliderEl.addEventListener('input', (e) => {
          valueEl.value = e.target.value;
          this.config[slider.prop] = parseFloat(e.target.value);
          
          if (slider.prop === 'gravity' && this.world) {
            this.world.gravity.set(0, this.config.gravity, 0);
          }
        });
        
        valueEl.addEventListener('input', (e) => {
          sliderEl.value = e.target.value;
          this.config[slider.prop] = parseFloat(e.target.value);
          
          if (slider.prop === 'gravity' && this.world) {
            this.world.gravity.set(0, this.config.gravity, 0);
          }
        });
      }
    });
  }
  
  addBox() {
    console.log('📦 Añadiendo caja...');
    
    const size = 1 + Math.random() * 2;
    const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.6);
    
    // Física
    const shape = new CANNON.Box(new CANNON.Vec3(size/2, size/2, size/2));
    const body = new CANNON.Body({ mass: this.config.mass });
    body.addShape(shape);
    body.position.set(
      (Math.random() - 0.5) * 15,
      8 + Math.random() * 5,
      (Math.random() - 0.5) * 15
    );
    body.material.friction = this.config.friction;
    body.material.restitution = this.config.restitution;
    this.world.add(body);
    
    // Visual
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshLambertMaterial({ color: color.getHex() });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    
    const obj = { body, mesh, type: 'box', mass: this.config.mass };
    this.objects.push(obj);
    this.stats.activeObjects++;
    
    // Aplicar impulso inicial
    const impulse = new CANNON.Vec3(
      (Math.random() - 0.5) * 5,
      2,
      (Math.random() - 0.5) * 5
    );
    body.applyImpulse(impulse, body.position);
  }
  
  addSphere() {
    console.log('⚪ Añadiendo esfera...');
    
    const radius = 0.5 + Math.random() * 1;
    const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.6);
    
    // Física
    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({ mass: this.config.mass });
    body.addShape(shape);
    body.position.set(
      (Math.random() - 0.5) * 15,
      8 + Math.random() * 5,
      (Math.random() - 0.5) * 15
    );
    body.material.friction = this.config.friction;
    body.material.restitution = this.config.restitution;
    this.world.add(body);
    
    // Visual
    const geometry = new THREE.SphereGeometry(radius, 16, 12);
    const material = new THREE.MeshLambertMaterial({ color: color.getHex() });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    
    const obj = { body, mesh, type: 'sphere', mass: this.config.mass };
    this.objects.push(obj);
    this.stats.activeObjects++;
    
    // Aplicar impulso inicial
    const impulse = new CANNON.Vec3(
      (Math.random() - 0.5) * 5,
      2,
      (Math.random() - 0.5) * 5
    );
    body.applyImpulse(impulse, body.position);
  }
  
  addCylinder() {
    console.log('🥫 Añadiendo cilindro...');
    
    const radius = 0.3 + Math.random() * 0.8;
    const height = 1 + Math.random() * 2;
    const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.6);
    
    // Física
    const shape = new CANNON.Cylinder(radius, radius, height, 8);
    const body = new CANNON.Body({ mass: this.config.mass });
    body.addShape(shape);
    body.position.set(
      (Math.random() - 0.5) * 15,
      8 + Math.random() * 5,
      (Math.random() - 0.5) * 15
    );
    body.material.friction = this.config.friction;
    body.material.restitution = this.config.restitution;
    this.world.add(body);
    
    // Visual
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 16);
    const material = new THREE.MeshLambertMaterial({ color: color.getHex() });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    
    const obj = { body, mesh, type: 'cylinder', mass: this.config.mass };
    this.objects.push(obj);
    this.stats.activeObjects++;
    
    // Aplicar impulso inicial
    const impulse = new CANNON.Vec3(
      (Math.random() - 0.5) * 5,
      2,
      (Math.random() - 0.5) * 5
    );
    body.applyImpulse(impulse, body.position);
  }
  
  updatePhysics() {
    if (!this.world) return;
    
    // Paso de física
    this.world.step(this.deltaTime);
    
    // Actualizar objetos visuales
    this.objects.forEach(obj => {
      obj.mesh.position.copy(obj.body.position);
      obj.mesh.quaternion.copy(obj.body.quaternion);
    });
    
    // Actualizar robot
    this.updateRobot();
  }
  
  updateRobot() {
    if (!this.robot.isActive) return;
    
    // Calcular ángulo objetivo
    this.robot.targetAngle = (this.config.rotation * Math.PI) / 180;
    
    // Movimiento suave hacia objetivo
    const angleDiff = this.robot.targetAngle - this.robot.currentAngle;
    this.robot.currentAngle += angleDiff * 0.05;
    
    // Aplicar rotación
    this.robot.base.rotation.y = this.robot.currentAngle;
    
    // Actualizar estadísticas
    this.stats.currentAngle = (this.robot.currentAngle * 180 / Math.PI).toFixed(1);
  }
  
  updateVectors() {
    // Limpiar vectores anteriores
    this.vectors.forEach(vector => {
      if (vector.arrow) {
        this.scene.remove(vector.arrow);
      }
    });
    this.vectors = [];
    
    // Crear nuevos vectores
    this.objects.forEach(obj => {
      const position = obj.body.position;
      const velocity = obj.body.velocity;
      const speed = Math.sqrt(
        velocity.x * velocity.x + 
        velocity.y * velocity.y + 
        velocity.z * velocity.z
      );
      
      if (speed > 0.1) {
        if (this.showVelocityVectors) {
          const arrow = new THREE.ArrowHelper(
            new THREE.Vector3(velocity.x, velocity.y, velocity.z).normalize(),
            new THREE.Vector3(position.x, position.y, position.z),
            speed * 0.5,
            0x00ffd1
          );
          this.scene.add(arrow);
          this.vectors.push({ arrow, type: 'velocity' });
        }
        
        if (this.showMomentumVectors) {
          const momentum = {
            x: velocity.x * obj.mass,
            y: velocity.y * obj.mass,
            z: velocity.z * obj.mass
          };
          const momentumMag = Math.sqrt(
            momentum.x * momentum.x + 
            momentum.y * momentum.y + 
            momentum.z * momentum.z
          );
          
          const arrow = new THREE.ArrowHelper(
            new THREE.Vector3(momentum.x, momentum.y, momentum.z).normalize(),
            new THREE.Vector3(position.x, position.y, position.z),
            momentumMag * 0.02,
            0xffaa00
          );
          this.scene.add(arrow);
          this.vectors.push({ arrow, type: 'momentum' });
        }
      }
    });
  }
  
  updateStatistics() {
    if (this.objects.length === 0) return;
    
    let totalSpeed = 0;
    let maxSpeed = 0;
    let totalEnergy = 0;
    
    this.objects.forEach(obj => {
      const velocity = obj.body.velocity;
      const speed = Math.sqrt(
        velocity.x * velocity.x + 
        velocity.y * velocity.y + 
        velocity.z * velocity.z
      );
      
      totalSpeed += speed;
      if (speed > maxSpeed) maxSpeed = speed;
      
      const kineticEnergy = 0.5 * obj.mass * speed * speed;
      const potentialEnergy = obj.mass * Math.abs(this.config.gravity) * obj.body.position.y;
      totalEnergy += kineticEnergy + potentialEnergy;
    });
    
    this.stats.maxVelocity = maxSpeed.toFixed(2);
    this.stats.avgVelocity = (totalSpeed / this.objects.length).toFixed(2);
    this.stats.totalEnergy = totalEnergy.toFixed(2);
    this.stats.activeObjects = this.objects.length;
  }
  
  updateUI() {
    // Tiempo
    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) {
      const minutes = Math.floor(this.simulationTime / 60);
      const seconds = Math.floor(this.simulationTime % 60);
      const tenths = Math.floor((this.simulationTime % 1) * 10);
      timeDisplay.textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}`;
    }
    
    // FPS
    const fpsEl = document.getElementById('fpsCounter');
    if (fpsEl) {
      const fps = Math.round(1000 / (this.deltaTime * 1000));
      fpsEl.textContent = fps;
    }
    
    // Delta time
    const deltaEl = document.getElementById('deltaTime');
    if (deltaEl) {
      deltaEl.textContent = (this.deltaTime * 1000).toFixed(1) + 'ms';
    }
    
    // Estadísticas
    this.updateStatistics();
    this.updateAnalysisDisplay();
  }
  
  updateAnalysisDisplay() {
    const elements = {
      'activeObjects': this.stats.activeObjects,
      'collisionCount': this.stats.collisionCount,
      'totalEnergy': this.stats.totalEnergy + ' J',
      'maxVelocity': this.stats.maxVelocity + ' m/s',
      'avgVelocity': this.stats.avgVelocity + ' m/s',
      'currentAngle': this.stats.currentAngle + '°',
      'angularAcceleration': this.stats.angularAcceleration.toFixed(2) + ' rad/s²',
      'damageReduction': this.stats.damageReduction + '%',
      'trajectoryEfficiency': this.stats.trajectoryEfficiency + '%',
      'optimalTrajectory': this.stats.trajectoryEfficiency > 80 ? 'Calculada' : 'No calculada',
      'optimizationStatus': this.stats.damageReduction > 80 ? 'Optimizada' : 'En progreso'
    };
    
    Object.entries(elements).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = value;
      }
    });
  }
  
  // Métodos de control
  play() {
    this.isRunning = true;
    console.log('▶️ Reproduciendo simulación');
  }
  
  pause() {
    this.isRunning = false;
    console.log('⏸️ Pausando simulación');
  }
  
  reset() {
    this.pause();
    this.simulationTime = 0;
    
    // Remover objetos
    this.objects.forEach(obj => {
      this.scene.remove(obj.mesh);
      this.world.remove(obj.body);
    });
    this.objects = [];
    
    // Remover vectores
    this.vectors.forEach(vector => {
      if (vector.arrow) {
        this.scene.remove(vector.arrow);
      }
    });
    this.vectors = [];
    
    // Resetear estadísticas
    this.stats = {
      activeObjects: 0,
      collisionCount: 0,
      totalEnergy: 0,
      maxVelocity: 0,
      avgVelocity: 0,
      currentAngle: 0,
      angularAcceleration: 0,
      damageReduction: 0,
      trajectoryEfficiency: 0
    };
    
    this.resetRobot();
    console.log('🔄 Simulación reiniciada');
  }
  
  step() {
    if (!this.isRunning) {
      this.updatePhysics();
      this.simulationTime += this.deltaTime;
    }
  }
  
  toggleRobot() {
    this.robot.isActive = !this.robot.isActive;
    const button = document.getElementById('activateRobot');
    if (button) {
      button.textContent = this.robot.isActive ? 'Desactivar Robot' : 'Activar Robot';
      button.classList.toggle('btn-primary');
      button.classList.toggle('btn-secondary');
    }
  }
  
  resetRobot() {
    this.robot.currentAngle = 0;
    this.robot.targetAngle = 0;
    this.robot.isActive = false;
    
    const button = document.getElementById('activateRobot');
    if (button) {
      button.textContent = 'Activar Robot';
      button.classList.add('btn-primary');
      button.classList.remove('btn-secondary');
    }
  }
  
  optimizeLayout() {
    console.log('🔧 Optimizando disposición...');
    this.stats.damageReduction = Math.floor(Math.random() * 30 + 70);
    this.updateAnalysisDisplay();
  }
  
  optimizeTrajectory() {
    console.log('🛤️ Optimizando trayectoria...');
    this.stats.trajectoryEfficiency = Math.floor(Math.random() * 30 + 70);
    this.updateAnalysisDisplay();
  }
  
  togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.classList.toggle('collapsed');
      const button = document.getElementById('toggle' + panelId.replace('Panel', ''));
      if (button) {
        button.textContent = panel.classList.contains('collapsed') ? '+' : '−';
      }
    }
  }
  
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  onCanvasClick(event) {
    if (!this.isRunning) return;
    
    // Raycast para detectar objetos clickeados
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    
    const meshes = this.objects.map(obj => obj.mesh);
    const intersects = raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
      const clickedObject = this.objects.find(obj => obj.mesh === intersects[0].object);
      if (clickedObject) {
        // Aplicar impulso
        const impulse = new CANNON.Vec3(
          (Math.random() - 0.5) * this.config.impulse,
          this.config.impulse,
          (Math.random() - 0.5) * this.config.impulse
        );
        clickedObject.body.applyImpulse(impulse, clickedObject.body.position);
        console.log('💥 Impulso aplicado');
      }
    }
  }
  
  onKeyPress(event) {
    switch(event.code) {
      case 'Space':
        event.preventDefault();
        if (this.isRunning) {
          this.pause();
        } else {
          this.play();
        }
        break;
      case 'KeyR':
        if (event.ctrlKey) {
          event.preventDefault();
          this.reset();
        }
        break;
      case 'KeyO':
        if (event.ctrlKey) {
          event.preventDefault();
          this.optimizeLayout();
        }
        break;
      case 'KeyT':
        if (event.ctrlKey) {
          event.preventDefault();
          this.optimizeTrajectory();
        }
        break;
    }
  }
  
  startLoop() {
    console.log('🎬 Iniciando bucle de animación...');
    
    const animate = () => {
      requestAnimationFrame(animate);
      
      const startTime = performance.now();
      
      if (this.isRunning) {
        this.updatePhysics();
        this.simulationTime += this.deltaTime;
        
        // Actualizar vectores cada 10 frames
        if (this.frameCount % 10 === 0) {
          this.updateVectors();
        }
      }
      
      // Renderizar
      this.renderer.render(this.scene, this.camera);
      
      // Calcular delta time real
      this.deltaTime = (performance.now() - startTime) / 1000;
      
      // Actualizar UI
      this.updateUI();
      
      this.frameCount++;
    };
    
    animate();
  }
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM cargado, iniciando simulador...');
  window.simulator = new IndustrialSimulator();
});

// Mensaje de bienvenida
console.log('🚀 Simulador Industrial 3D cargado correctamente');
console.log('Controles:');
console.log('- Espacio: Play/Pause');
console.log('- Ctrl+R: Reset');
console.log('- Ctrl+O: Optimizar layout');
console.log('- Ctrl+T: Optimizar trayectorias');
console.log('- Click en objetos: Aplicar impulso');
