<?php
include_once 'conexion.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $nombre = $_POST['nombre'];
    $area = $_POST['Areas'];

    $stat = $conexion->prepare("INSERT INTO medico(NOMBRE, ID_AREA) VALUES(?,?)");
    $stat->bind_param("ss", $nombre, $area);
     
    if ($stat->execute()) {
        echo "Datos guardados";
    } else {
        echo "Error al guardar los datos: " . $stat->error;
    }
}
?>