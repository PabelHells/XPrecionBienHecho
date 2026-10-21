<?php

$host = "localhost";
$usuario = "root";
$contraseña= "";
$baseDatos = "";
$conexion = new mysqli(hostname: $host, username: $usuario, password: $contraseña, database: $baseDatos);

if ($conexion->connect_error){
    die("Fallo en la conexión: " . $conexion->connect_error);
}else{
    echo "Conexión exitosa";
}

?>