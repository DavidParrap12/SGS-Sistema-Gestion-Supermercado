# Script de prueba para el sistema de permisos granular

# 1. Primero, vamos a crear un usuario con rol de manager
$managerUser = @{
    username = "manager_test"
    email = "manager@test.com"
    password = "Test123456"
    role = "manager"
} | ConvertTo-Json

Write-Host "Creando usuario manager..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "http://localhost:3005/api/auth/admin/register" -Method POST -Body $managerUser -ContentType "application/json" -UseBasicParsing

# 2. Crear un usuario con rol de inventory_staff
$inventoryUser = @{
    username = "inventory_test"
    email = "inventory@test.com"
    password = "Test123456"
    role = "inventory_staff"
} | ConvertTo-Json

Write-Host "Creando usuario inventory_staff..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "http://localhost:3005/api/auth/admin/register" -Method POST -Body $inventoryUser -ContentType "application/json" -UseBasicParsing

# 3. Crear un usuario con rol de cashier
$cashierUser = @{
    username = "cashier_test"
    email = "cashier@test.com"
    password = "Test123456"
    role = "cashier"
} | ConvertTo-Json

Write-Host "Creando usuario cashier..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "http://localhost:3005/api/auth/admin/register" -Method POST -Body $cashierUser -ContentType "application/json" -UseBasicParsing

Write-Host "Usuarios creados exitosamente!" -ForegroundColor Green
Write-Host "Ahora puedes probar el sistema de permisos en el panel de administración." -ForegroundColor Green