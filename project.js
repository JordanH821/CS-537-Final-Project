'use strict';

var canvas;
var gl;
var aspect;
var modelViewMatrix = lookAt(
    vec3(0.0, 0.0, 1) /* */,
    vec3(0, 0, 0) /* looking at */,
    vec3(0, 1, 0) /* up */
);

var textureObjs = []
var textures = {}


var projectionMatrix = perspective(90.0, aspect, 0.2, 100);

let currentObject = 0;
let objectList = [];

var boxImage;
var boxTexture;

let kitty = {
    objPath: './objs/kitty/kitty.obj',
    vertexShader: 'kitty-vertex-shader',
    fragmentShader: 'kitty-fragment-shader',
    scale: scalem(0.01, 0.01, 0.01),
    translation: translate(0.25, 0.25, 0),
};
//objectList.push(kitty);

let puppy = {
    objPath: './objs/puppy/Puppy.obj',
    vertexShader: 'puppy-vertex-shader',
    fragmentShader: 'puppy-fragment-shader',
    scale: scalem(0.01, 0.01, 0.01),
    translation: translate(-0.25, 0.25, 0),
};
//objectList.push(puppy);

let pizza = {
    objPath: './objs/pizza/pizza.obj',
    vertexShader: 'vaccine-vertex-shader',
    fragmentShader: 'vaccine-fragment-shader',
    scale: scalem (1 ,1 ,1),
    translation: translate(-.75, .25, 0)
};
objectList.push(pizza);

let wooden_crate = {
    objPath: './objs/box/wooden crate.obj',
    vertexShader: 'wooden_crate-vertex-shader',
    fragmentShader: 'wooden_crate-fragment-shader',
    scale: scalem(.25, .25, .25),
    translation: translate(.8, .25, 0),
};
objectList.push(wooden_crate);

let bunny = {
    objPath: './objs/bunny/bunny.obj',
    vertexShader: 'bunny-vertex-shader',
    fragmentShader: 'bunny-fragment-shader',
    scale: scalem(2, 2, 2),
    translation: mat4(),
};
//objectList.push(bunny);

function configureTexture( image ) {
    var texture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, 
         gl.RGB, gl.UNSIGNED_BYTE, image );
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, 
                      gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
    return texture;
}


function getOrderedNormalsFromObj(o) {
    var normalsOrderedWithVertices = new Array(o.c_verts.length);
    let VI = o.i_verts,
        NI = o.i_norms,
        NC = o.c_norms;
    for (let i = 0; i < VI.length; i++) {
        let x = VI[i] * 3;
        let y = NI[i] * 3;
        normalsOrderedWithVertices[x] = NC[y];
        normalsOrderedWithVertices[x + 1] = NC[y + 1];
        normalsOrderedWithVertices[x + 2] = NC[y + 2];
    }
    return normalsOrderedWithVertices;
}

function getOrderedTextureCoordsFromObj(o) {
    let l = o.i_verts.length;
    let VI = o.i_verts,
        TI = o.i_uvt,
        TC = o.c_uvt;
    var texCoordsOrderedWithVertices = new Array(o.c_verts.length);
    texCoordsOrderedWithVertices.fill(-1);
    for (let i = 0; i < l; i++) {
        let x = VI[i] * 3;
        let y = TI[i] * 2;
        texCoordsOrderedWithVertices[x] = TC[y];
        texCoordsOrderedWithVertices[x + 1] = TC[y + 1];
        texCoordsOrderedWithVertices[x + 2] = 0;
    }

    return texCoordsOrderedWithVertices;
}

function loadedObj(data) {
    let obj = loadOBJFromBuffer(data);
    console.log(obj);
    let jsObj = objectList[currentObject];
    jsObj['indices'] = obj.i_verts;
    jsObj['vertices'] = obj.c_verts;
    jsObj['numVerts'] = jsObj['indices'].length;
    jsObj['normals'] = getOrderedNormalsFromObj(obj);
    jsObj['texCoords'] = getOrderedTextureCoordsFromObj(obj);
    currentObject++;
    if (currentObject < objectList.length) {
        loadOBJFromPath(objectList[currentObject]['objPath'], loadedObj);
    } else {
        setupAfterDataLoad();
    }
}


function setupObjectShaderBuffers(obj, i) {

    console.log(obj)
    // init shaders
    obj['shader'] = initShaders(gl, obj['vertexShader'], obj['fragmentShader']);

    // use shaders
    gl.useProgram(obj['shader']);

    // index buffer
    obj['indexBuffer'] = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj['indexBuffer']);
    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(obj['indices']),
        gl.STATIC_DRAW
    );

    obj['textureBuffer'] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj['textureBuffer']);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(obj['texCoords']), gl.STATIC_DRAW);

    // vertex buffer
    obj['vertexBuffer'] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj['vertexBuffer']);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(obj['vertices']),
        gl.STATIC_DRAW
    );

    // model view matrix location
    obj['modelViewMatrixLoc'] = gl.getUniformLocation(
        obj['shader'],
        'modelViewMatrix'
    );

    // projection matrix location
    obj['projectionMatrixLoc'] = gl.getUniformLocation(
        obj['shader'],
        'projectionMatrix'
    );

    // scale matrix
    obj['scaleLoc'] = gl.getUniformLocation(obj['shader'], 'scale');

    // translation matrix
    obj['translationLoc'] = gl.getUniformLocation(obj['shader'], 'translation');

    // vertex position
    obj['vPosition'] = gl.getAttribLocation(obj['shader'], 'vPosition');

    obj['vTexCoord'] = gl.getAttribLocation(obj['shader'], "vTexCoord");
    gl.vertexAttribPointer(obj['vTexCoord'], 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(obj['vTexCoord']);
}


function renderObject(obj, i) {
    gl.useProgram(obj['shader']);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj['indexBuffer']);

    // pass vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, obj['vertexBuffer']);
    gl.vertexAttribPointer(obj['vPosition'], 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(obj['vPosition']);

    // pass camera matrices
    gl.uniformMatrix4fv(
        obj['modelViewMatrixLoc'],
        false,
        flatten(modelViewMatrix)
    );

    gl.uniformMatrix4fv(
        obj['projectionMatrixLoc'],
        false,
        flatten(projectionMatrix)
    );

    // pass scale
    gl.uniformMatrix4fv(obj['scaleLoc'], false, flatten(obj['scale']));

    // pass translation
    gl.uniformMatrix4fv(
        obj['translationLoc'],
        false,
        flatten(obj['translation'])
    );

    gl.bindTexture(gl.TEXTURE_2D, textureObjs[i-1]);

    obj['texLoc'] = gl.getUniformLocation( obj['shader'], "texture" );
    gl.uniform1i(obj['texLoc'], 0);


    gl.drawElements(gl.TRIANGLES, obj['numVerts'], gl.UNSIGNED_SHORT, 0);
}



function setupAfterDataLoad() {
    gl.enable(gl.DEPTH_TEST);

    var i = 1;
    for (const obj of objectList) {
        console.log(document.getElementById("texture_" + i))
        textureObjs.push(configureTexture(document.getElementById("texture_" + i)));
        setupObjectShaderBuffers(obj, i);
        i++;
    }

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    var i = 1;
    for (const obj of objectList) {
        renderObject(obj, i);
        i++;
    }
    requestAnimationFrame(render);
}

window.onload = function init() {
    canvas = document.getElementById('gl-canvas');

    gl = WebGLUtils.setupWebGL(canvas);

    if (!gl) {
        alert("WebGL isn't available");
    }

    // setup gl vars
    gl.viewport(0, 0, canvas.width, canvas.height);
    aspect = canvas.width / canvas.height;
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // start loading objects
    loadOBJFromPath(objectList[0]['objPath'], loadedObj);
};