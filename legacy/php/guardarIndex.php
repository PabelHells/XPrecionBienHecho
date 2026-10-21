<?php
include_once "config.php";

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    try {
        $database = new conexion();
        $database->conectar();
    } catch (Exception $e) {
        // Manejo de excepciones
        echo 'Error: ' . $e->getMessage();
    }
}
?>