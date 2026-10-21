<?php
// Configuración de la base de datos
$host = 'localhost'; // Cambia si es necesario
$dbname = 'nombre_base_datos'; // Cambia al nombre de tu base de datos
$username_db = 'usuario_bd'; // Cambia al usuario de tu base de datos
$password_db = 'contraseña_bd'; // Cambia a la contraseña de tu base de datos

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username_db, $password_db);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Error al conectar con la base de datos: " . $e->getMessage());
}

// Verificar si el formulario ha sido enviado
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username']);
    $password = trim($_POST['password']);

    if (empty($username) || empty($password)) {
        echo '<script>
                alert("Por favor completa todos los campos.");
                window.location.href="index.html"; // Cambia al archivo correcto si es necesario
              </script>';
        exit;
    }

    $sql = "SELECT * FROM usuarios WHERE username = :username";
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':username', $username);
    $stmt->execute();

    if ($stmt->rowCount() === 1) {
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (password_verify($password, $user['password'])) {
            // Inicio de sesión exitoso
            echo '<script>
                    alert("¡Inicio de sesión exitoso!");
                    window.location.href="dashboard.html"; // Cambia al archivo correcto si es necesario
                  </script>';
        } else {
            // Contraseña incorrecta
            echo '<script>
                    alert("Contraseña incorrecta.");
                    window.location.href="index.html"; // Cambia al archivo correcto si es necesario
                  </script>';
        }
    } else {
        // Usuario no encontrado
        echo '<script>
                alert("Usuario no encontrado.");
                window.location.href="index.html"; // Cambia al archivo correcto si es necesario
              </script>';
    }
}
?>