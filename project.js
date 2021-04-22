"use strict";

var canvas;
var gl;

var numVerticesInAllCovidVaxFaces;

var covid_vaccine_indicies;
var covid_vaccine_verts;
//var bunny_vertex_colors;

var m;


// We're starting out by rendering this cube with tmp_vertices and tmp_indices.
// TODO: Change the file to render the bunny shape and then delete these two variables.

// You probably don't want to change this function.
function loaded(data, _callback)
{
    m = loadOBJFromBuffer(data);
    covid_vaccine_indicies = m.i_verts;
    covid_vaccine_verts = m.c_verts;
    numVerticesInAllCovidVaxFaces = covid_vaccine_indicies.length;
    //bunny_vertex_colors = assign_vertex_colors(bunny_vertices);
    _callback();
}

// You probably don't want to change this function.
window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    // Load OBJ file using objLoader.js functions
    // These callbacks ensure the data is loaded before rendering occurs.
    loadOBJFromPath("objs/covid_vaccine/SARS_CoV_2_Vaccine.obj", loaded, setup_after_data_load);
}

// TODO: Edit this function.
function setup_after_data_load(){
    
    gl.enable(gl.DEPTH_TEST);
    
    // Load shaders and initialize attribute buffers
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Array element buffer
    var iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(covid_vaccine_indicies), gl.STATIC_DRAW);


    // Vertex array attribute buffer
    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(covid_vaccine_verts), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    /*pLoc = gl.getUniformLocation(program, "p");
    mvLoc = gl.getUniformLocation(program, "mv");

   var bufferIdColors = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferIdColors );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(bunny_vertex_colors), gl.STATIC_DRAW );

    
    // Associate shader variables with our vertex data buffer.
    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );*/
        render();   
    }



// TODO: Edit this function.
function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //gl.uniformMatrix4fv(mvLoc, gl.FALSE, flatten(mv));

    gl.drawElements( gl.TRIANGLES, numVerticesInAllCovidVaxFaces, gl.UNSIGNED_SHORT, 0 );

    requestAnimFrame( render );
}

