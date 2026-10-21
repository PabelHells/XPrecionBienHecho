<?php
include_once 'conexion.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $servicio = $_POST['servicio'];
    $precio = $_POST['precioServicio'];

    $stat = $conexion->prepare("INSERT INTO tipo_de_rayos_x(SERVICIO, PRECIOSERVICIO) VALUES(?, ?)");
    $stat->bind_param("ss", $servicio, $precio);
     
    if ($stat->execute()) {
        echo "Datos guardados";
    } else {
        echo "Error al guardar los datos: " . $stat->error;
    }
}
?>