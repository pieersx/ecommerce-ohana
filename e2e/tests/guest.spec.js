const { expect, test } = require('@playwright/test');

test.describe('Flujo invitado (no cliente)', () => {
  test('ve el catálogo con productos y precios', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Catálogo Lima Peru' })).toBeVisible();

    const cards = page.locator('.product-card');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(3);

    await expect(cards.first().locator('.product-card-actions strong').first()).toContainText('S/');
  });

  test('puede llenar el carrito pero debe iniciar sesión para comprar', async ({ page }) => {
    await page.goto('/');

    await page.locator('.product-card').first().getByRole('button', { name: 'Agregar' }).click();
    await expect(page.getByText('agregado al carrito.')).toBeVisible();

    await page.goto('/carrito');
    await expect(page.getByRole('heading', { name: 'Tu pedido personalizado' })).toBeVisible();
    await expect(page.locator('.cart-line')).toHaveCount(1);

    const submit = page.getByRole('button', { name: 'Registrate o inicia sesion' });
    await expect(submit).toBeVisible();

    await page.getByLabel('Nombre y apellidos').fill('Visitante Prueba');
    await page.getByLabel('Teléfono').fill('999111222');
    await page.getByLabel('Dirección de calle').fill('Av. Prueba 123');
    await submit.click();

    await expect(page).toHaveURL(/\/login/);
  });

  test('no puede entrar a pedidos, mensajes ni admin', async ({ page }) => {
    await page.goto('/pedidos');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/mensajes');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });
});
