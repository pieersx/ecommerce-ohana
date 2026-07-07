const { expect, test } = require('@playwright/test');

function uniqueEmail(tag) {
  return `${tag}-${Date.now()}-${Math.floor(Math.random() * 10000)}@e2e.test`;
}

async function registerCustomer(page, { nombre = 'Cliente E2E', email }) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Crear cuenta nueva' }).click();
  await page.getByLabel('Nombre completo').fill(nombre);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('clave-e2e-123');
  await page.getByRole('button', { name: 'Registrarme' }).click();
  await expect(page.getByText(`Bienvenido, ${nombre}.`)).toBeVisible();
}

test.describe('Flujo cliente', () => {
  test('registro, compra completa, pago simulado y boleta', async ({ page }) => {
    await registerCustomer(page, { email: uniqueEmail('compra') });

    // Agregar producto al carrito.
    await page.goto('/');
    const firstCard = page.locator('.product-card').first();
    const productName = await firstCard.locator('h3').innerText();
    await firstCard.getByRole('button', { name: 'Agregar' }).click();
    await expect(page.getByText('agregado al carrito.')).toBeVisible();

    // Checkout en el carrito.
    await page.goto('/carrito');
    await expect(page.locator('.cart-line')).toHaveCount(1);
    await page.getByLabel('Nombre y apellidos').fill('Cliente E2E');
    await page.getByLabel('Teléfono').fill('987654321');
    await page.getByLabel('Dirección de calle').fill('Av. Larco 345');
    const districtValue = await page
      .getByLabel('Distrito de Lima')
      .locator('option', { hasText: /^Miraflores - / })
      .getAttribute('value');
    await page.getByLabel('Distrito de Lima').selectOption(districtValue);

    await page.getByRole('button', { name: 'Crear pedido' }).click();

    // Redirige a Mis pedidos con el pedido pendiente.
    await expect(page).toHaveURL(/\/pedidos/);
    await expect(page.getByRole('heading', { name: 'Mis pedidos' })).toBeVisible();
    const orderRow = page.locator('.status-pill', { hasText: 'Pendiente' }).first();
    await expect(orderRow).toBeVisible();

    // Abrir el pedido y pagar (checkout simulado).
    await orderRow.click();
    await expect(page.getByText(productName).first()).toBeVisible();
    await page.getByRole('button', { name: 'Pagar con checkout externo' }).click();

    await expect(page).toHaveURL(/payment=success/);
    await expect(page.locator('.status-pill', { hasText: 'Pagado' }).first()).toBeVisible();

    // La boleta PDF se descarga.
    await page.locator('.status-pill', { hasText: 'Pagado' }).first().click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar boleta PDF' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/boleta-ohana-\d+\.pdf/);
  });

  test('puede editar sus datos en Mi cuenta', async ({ page }) => {
    await registerCustomer(page, { email: uniqueEmail('perfil') });

    await page.getByRole('button', { name: 'Cliente E2E' }).first().click();
    await expect(page.getByRole('heading', { name: 'Mis datos' })).toBeVisible();

    await page.getByLabel('Telefono').fill('911222333');
    await page.getByLabel('Direccion de calle').fill('Jr. Nueva 456');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByText('Datos actualizados correctamente.')).toBeVisible();
  });

  test('no puede entrar al panel admin', async ({ page }) => {
    await registerCustomer(page, { email: uniqueEmail('noadmin') });

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Panel solo para administradores' })).toBeVisible();
  });
});
