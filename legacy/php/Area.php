<?php
include_once 'conexion.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $area = $_POST['area'];

    $stat = $conexion->prepare("INSERT INTO area(AREA) VALUES(?)");
    $stat->bind_param("s", $area);
     
    if ($stat->execute()) {
        echo "Datos guardados";
    } else {
        echo "Error al guardar los datos: " . $stat->error;
    }
}
?>