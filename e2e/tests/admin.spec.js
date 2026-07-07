const { expect, test } = require('@playwright/test');

async function loginAdmin(page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@ohana.com');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button', { name: 'Iniciar sesion' }).click();
  await expect(page.getByText('Bienvenido, Administrador Ohana.')).toBeVisible();
}

test.describe('Flujo admin', () => {
  test('ve el centro de control con dashboard', async ({ page }) => {
    await loginAdmin(page);

    await page.goto('/admin');
    // Primera visita a /admin: el dev server de Vite compila el chunk en frío.
    await expect(page.getByRole('heading', { name: 'Centro de control' })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('heading', { name: 'Pedidos por estado' })).toBeVisible();
  });

  test('puede crear un producto y aparece en el catálogo', async ({ page }) => {
    await loginAdmin(page);

    await page.goto('/admin');
    await page.getByRole('button', { name: 'productos' }).click();
    await expect(page.getByRole('heading', { name: 'Nuevo producto' })).toBeVisible();

    const productName = `Producto E2E ${Date.now()}`;
    await page.getByLabel('Nombre', { exact: true }).fill(productName);
    await page.getByLabel('Precio', { exact: true }).fill('45');
    await page.getByLabel('Stock', { exact: true }).fill('12');
    await page.getByRole('button', { name: 'Crear producto' }).click();

    await expect(page.getByText(productName).first()).toBeVisible();

    // Aparece en el catálogo público.
    await page.goto(`/?q=${encodeURIComponent(productName)}`);
    await expect(page.locator('.product-card h3', { hasText: productName })).toBeVisible();
  });

  test('puede gestionar pedidos de la tienda y cambiar su estado', async ({ page }) => {
    await loginAdmin(page);

    await page.goto('/admin');
    await page.getByRole('button', { name: 'Pedidos', exact: true }).click();

    const firstOrder = page.locator('.compact-row').first();
    await expect(firstOrder).toBeVisible();

    await firstOrder.locator('select').selectOption('Entregado');
    await expect(page.getByText('Estado actualizado.')).toBeVisible();
  });
});
