if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
var container;
var camera, scene, renderer;
var plane, cube;
var mouse, raycaster, isShiftDown = false;
var rollOverMesh, rollOverMaterial;
var cubeGeo, cubeMaterial;
var objects = [];
//add camera rotation
var clock = new THREE.Clock();
var controls;
var maxHeight = 0;
var areas_cache = {};
var connect_cache = {};


//utility function
function isAdjacent(v1,v2){
	var samePos = 0;
	var adjacentPos = 0;
	if(v1.position.x === v2.position.x){
		samePos++;
	}
	if(v1.position.y === v2.position.y){
		samePos++;
	}
	if(v1.position.z === v2.position.z){
		samePos++;
	}
	if(samePos < 2){
		return false;
	}
	if(Math.abs(v1.position.x - v2.position.x) === 50){
		adjacentPos++;
	}
	if(Math.abs(v1.position.y - v2.position.y) === 50){
		adjacentPos++;
	}
	if(Math.abs(v1.position.z - v2.position.z) === 50){
		adjacentPos++;
	}
	if(adjacentPos === 1){
		return true;
	}else{
		return false;
	}
}

function build_connect(voxel){
	// console.dir(connect_cache);
	var keys_to_merge = [];
	for(var key in connect_cache){
		var list = connect_cache[key];
		for(var i= 0; i < list.length; i++){
			// console.log(list[i]);
			if(isAdjacent(list[i],voxel)){
				if(keys_to_merge.indexOf(key) < 0){
					keys_to_merge.push(key);
				}
			}
		}
	}
	console.dir(connect_cache);
	//merge connected keys

	if(keys_to_merge.length > 0){
		destinity = keys_to_merge[0];
		connect_cache[destinity].push(voxel);
		
		for(var i = 1; i < keys_to_merge.length; i++){
			connect_cache[destinity] = connect_cache[destinity].concat(connect_cache[keys_to_merge[i]]);
			delete connect_cache[keys_to_merge[i]];
		}
	}else{
		connect_cache[voxel.id.toString()] = [voxel];
	}

	console.log(Object.keys(connect_cache).length);
	return Object.keys(connect_cache).length;
}

function remove_connect(){
	//just redo the build_connect
	connect_cache = {};
	for(var i = 1; i < objects.length; i++){
		build_connect(objects[i]);
	}
	return Object.keys(connect_cache).length;

}

function build_areas(voxel){
	var key = "";
	key += voxel.position.x.toString() + ',' + voxel.position.z.toString();
	if(areas_cache[key] == undefined){
		areas_cache[key] = 0;
	}else{
		areas_cache[key]++;
	}

	return Object.keys(areas_cache).length;
}

function remove_areas(voxel){
	var key = "";
	key += voxel.position.x.toString() + ',' + voxel.position.z.toString();
	if(areas_cache[key] == undefined){
		areas_cache[key] = 0;
	}else{
		areas_cache[key]--;
	}

	if(areas_cache[key] <= 0){
		delete areas_cache[key];
	}
	return Object.keys(areas_cache).length;
}

function saveProgress(){
	objs = [];
	var selected = objects.slice(1); //not include first roll-over on
	for(var i in selected){
		var pos = {};
		pos.x = selected[i].position.x;
		pos.y = selected[i].position.y;
		pos.z = selected[i].position.z;

		objs.push(pos);
	}
	// console.log('saved',objs);

	localStorage.setItem("builderSave", JSON.stringify(objs));
}

function loadProgress(){
	scene = null;
	

	scene = new THREE.Scene();
	objects = [];
	// roll-over helpers
	rollOverGeo = new THREE.BoxGeometry( 50, 50, 50 );
	rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
	rollOverMesh = new THREE.Mesh( rollOverGeo, rollOverMaterial );
	scene.add( rollOverMesh );
	// cubes
	cubeGeo = new THREE.BoxGeometry( 50, 50, 50 );
	cubeMaterial = new THREE.MeshLambertMaterial( { color: 0xfeb74c, map: new THREE.TextureLoader().load( "textures/wood.jpg" ) } );
	// grid
	var size = 500, step = 50;
	var geometry = new THREE.Geometry();
	for ( var i = - size; i <= size; i += step ) {
		geometry.vertices.push( new THREE.Vector3( - size, 0, i ) );
		geometry.vertices.push( new THREE.Vector3(   size, 0, i ) );
		geometry.vertices.push( new THREE.Vector3( i, 0, - size ) );
		geometry.vertices.push( new THREE.Vector3( i, 0,   size ) );
	}
	var material = new THREE.LineBasicMaterial( { color: 0x000000, opacity: 0.2, transparent: true } );
	var line = new THREE.LineSegments( geometry, material );
	scene.add( line );
	//
	raycaster = new THREE.Raycaster();
	mouse = new THREE.Vector2();
	var geometry = new THREE.PlaneBufferGeometry( 1000, 1000 );
	geometry.rotateX( - Math.PI / 2 );
	plane = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { visible: false } ) );
	scene.add( plane );
	objects.push( plane );

	// Lights
	var ambientLight = new THREE.AmbientLight( 0x606060 );
	scene.add( ambientLight );
	var directionalLight = new THREE.DirectionalLight( 0xffffff );
	directionalLight.position.set( 1, 0.75, 0.5 ).normalize();
	scene.add( directionalLight );

	document.addEventListener( 'mousemove', onDocumentMouseMove, false );
	document.addEventListener( 'mousedown', onDocumentMouseDown, false );
	document.addEventListener( 'keydown', onDocumentKeyDown, false );
	document.addEventListener( 'keyup', onDocumentKeyUp, false );
	//
	window.addEventListener( 'resize', onWindowResize, false );




	var json = localStorage.getItem("builderSave");
	var loadedObj = JSON.parse(json);

	for(var i in loadedObj){
		var voxel = new THREE.Mesh( cubeGeo, cubeMaterial );
		voxel.position.copy(loadedObj[i]);
		scene.add( voxel );
		objects.push( voxel );
		var height = (voxel.position.y-25)/50 + 1;
			if(height > maxHeight){
				maxHeight = height;						
			}
		document.getElementById('areas').innerHTML = build_areas(voxel);
		document.getElementById('connectivity').innerHTML = build_connect(voxel);
			
	}
	document.getElementById('maxHeight').innerHTML = maxHeight;
	document.getElementById('numCubes').innerHTML = objects.length-1;

	// render();

}

init();
render();
function init() {
	container = document.createElement( 'div' );
	document.body.appendChild( container );
	var info = document.createElement( 'div' );
	info.style.position = 'absolute';
	info.style.top = '10px';
	info.style.width = '100%';
	info.style.textAlign = 'center';
	info.innerHTML = '<p><strong>click</strong>: add cube, <strong>shift + click</strong>: remove cube</p><p><span class = "notice">Auto-Save Enabled</span></p>';
	container.appendChild( info );
	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.set( 500, 800, 1300 );
	camera.lookAt( new THREE.Vector3() );

	controls = new THREE.OrbitControls(camera);
	controls.miniDistance = 1000;
	controls.maxDistance = 2000;

	scene = new THREE.Scene();
	// roll-over helpers
	rollOverGeo = new THREE.BoxGeometry( 50, 50, 50 );
	rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
	rollOverMesh = new THREE.Mesh( rollOverGeo, rollOverMaterial );
	scene.add( rollOverMesh );
	// cubes
	cubeGeo = new THREE.BoxGeometry( 50, 50, 50 );
	cubeMaterial = new THREE.MeshLambertMaterial( { color: 0xfeb74c, map: new THREE.TextureLoader().load( "textures/wood.jpg" ) } );
	// grid
	var size = 500, step = 50;
	var geometry = new THREE.Geometry();
	for ( var i = - size; i <= size; i += step ) {
		geometry.vertices.push( new THREE.Vector3( - size, 0, i ) );
		geometry.vertices.push( new THREE.Vector3(   size, 0, i ) );
		geometry.vertices.push( new THREE.Vector3( i, 0, - size ) );
		geometry.vertices.push( new THREE.Vector3( i, 0,   size ) );
	}
	var material = new THREE.LineBasicMaterial( { color: 0x000000, opacity: 0.2, transparent: true } );
	var line = new THREE.LineSegments( geometry, material );
	scene.add( line );
	//
	raycaster = new THREE.Raycaster();
	mouse = new THREE.Vector2();
	var geometry = new THREE.PlaneBufferGeometry( 1000, 1000 );
	geometry.rotateX( - Math.PI / 2 );
	plane = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { visible: false } ) );
	scene.add( plane );
	objects.push( plane );
	// Lights
	var ambientLight = new THREE.AmbientLight( 0x606060 );
	scene.add( ambientLight );
	var directionalLight = new THREE.DirectionalLight( 0xffffff );
	directionalLight.position.set( 1, 0.75, 0.5 ).normalize();
	scene.add( directionalLight );
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setClearColor( 0xf0f0f0 );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );
	document.addEventListener( 'mousemove', onDocumentMouseMove, false );
	document.addEventListener( 'mousedown', onDocumentMouseDown, false );
	document.addEventListener( 'keydown', onDocumentKeyDown, false );
	document.addEventListener( 'keyup', onDocumentKeyUp, false );
	//
	window.addEventListener( 'resize', onWindowResize, false );

	var load_button = document.getElementById('load');
	load_button.addEventListener('click',function(event){
		loadProgress();
	});

	var resetCAM_button = document.getElementById('resetCam');
	resetCAM_button.addEventListener('click',function(event){
		camera.position.set( 500, 800, 1300 );
		camera.lookAt( new THREE.Vector3() );
	})
}
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}
function onDocumentMouseMove( event ) {
	event.preventDefault();
	mouse.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );
	raycaster.setFromCamera( mouse, camera );
	var intersects = raycaster.intersectObjects( objects );
	if ( intersects.length > 0 ) {
		var intersect = intersects[ 0 ];
		rollOverMesh.position.copy( intersect.point ).add( intersect.face.normal );
		rollOverMesh.position.divideScalar( 50 ).floor().multiplyScalar( 50 ).addScalar( 25 );
	}
	render();
}
function onDocumentMouseDown( event ) {
	event.preventDefault();
	mouse.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );
	raycaster.setFromCamera( mouse, camera );
	var intersects = raycaster.intersectObjects( objects );
	if ( intersects.length > 0 ) {
		var intersect = intersects[ 0 ];
		// delete cube
		if ( isShiftDown ) {
			if ( intersect.object != plane ) {

				var areas = remove_areas(intersect.object);

				scene.remove( intersect.object );
				objects.splice( objects.indexOf( intersect.object ), 1 );

				document.getElementById('numCubes').innerHTML = objects.length-1;
				document.getElementById('areas').innerHTML = areas;
				document.getElementById('connectivity').innerHTML = remove_connect();
			}
		// create cube
		} else {
			var voxel = new THREE.Mesh( cubeGeo, cubeMaterial );
			voxel.position.copy( intersect.point ).add( intersect.face.normal );
			voxel.position.divideScalar( 50 ).floor().multiplyScalar( 50 ).addScalar( 25 );
			console.log('voxel',voxel);
			scene.add( voxel );
			objects.push( voxel );

			

			var height = (voxel.position.y-25)/50 + 1;
			if(height > maxHeight){
				maxHeight = height;
				document.getElementById('maxHeight').innerHTML = maxHeight;
			}
			document.getElementById('numCubes').innerHTML = objects.length-1;
			document.getElementById('areas').innerHTML = build_areas(voxel);
			document.getElementById('connectivity').innerHTML = build_connect(voxel);

		}
		saveProgress();
		render();
	}
	// console.log(objects);
}
function onDocumentKeyDown( event ) {
	switch( event.keyCode ) {
		case 16: isShiftDown = true; break;
	}
}
function onDocumentKeyUp( event ) {
	switch ( event.keyCode ) {
		case 16: isShiftDown = false; break;
	}
}
function render() {
	renderer.render( scene, camera );
}
		