const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const Handlebars = require('handlebars');

const publicDate = {
    id: 'date-1',
    title: 'Una cita especial',
    date_time: '2026-10-22T18:00:00Z',
    collage_photo_ids: '["photo-1"]',
    Places: { name: 'Nuestro lugar' },
    DatePhotos: [{ id: 'photo-1', photo_url: '/photo.jpg' }]
};
const privateDescription = 'Un recuerdo privado de esta cita';
let selectedFields;
const database = {
    from(table) {
        assert.equal(table, 'Dates');
        return this;
    },
    select(fields) {
        selectedFields = fields;
        return this;
    },
    eq(field, value) {
        assert.equal(field, 'id');
        assert.equal(value, publicDate.id);
        return this;
    },
    async single() {
        return {
            data: {
                ...publicDate,
                ...(selectedFields.startsWith('*') ? { description: privateDescription } : {})
            },
            error: null
        };
    },
    async order() {
        return { data: [{ ...publicDate }], error: null };
    }
};
const supabasePath = require.resolve('../src/config/supabase');
require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: database };
const controller = require('../src/controllers/DateController');
const renderView = Handlebars.compile(readFileSync(
    path.join(__dirname, '../src/views/planner/date-view.hbs'), 'utf8'
));

async function viewAs(user) {
    let context;
    await controller.getView(
        { params: { id: publicDate.id }, session: { user } },
        {
            render(view, data) {
                assert.equal(view, 'planner/date-view');
                context = data;
            },
            redirect() { assert.fail('La cita debería abrirse'); }
        }
    );
    assert.ok(context);
    return context;
}

test('los invitados ven las fotos y los datos públicos sin consultar ni recibir la descripción', async () => {
    const context = await viewAs({ role: 'guest' });
    assert.equal(context.canViewDescription, false);
    assert.ok(!selectedFields.includes('*'));
    assert.ok(!selectedFields.includes('description'));
    assert.ok(!Object.hasOwn(context.date, 'description'));
    assert.equal(context.galleryPhotos.length, 1);
    assert.equal(context.collagePhotos.length, 1);
    const html = renderView(context);
    assert.ok(html.includes(publicDate.title));
    assert.ok(html.includes(publicDate.Places.name));
    assert.ok(html.includes('/photo.jpg'));
    assert.ok(!html.includes(privateDescription));
    assert.ok(!html.includes('fa-quote-left'));
    assert.ok(!html.includes('Edita esta cita'));
});

test('la plantilla oculta el bloque privado aunque reciba una descripción para un invitado', () => {
    const html = renderView({
        date: { ...publicDate, description: privateDescription },
        canViewDescription: false
    });
    assert.ok(!html.includes(privateDescription));
    assert.ok(!html.includes('fa-quote-left'));
});

test('los usuarios registrados pueden seguir leyendo la descripción', async () => {
    const context = await viewAs({ role: 'editor' });
    assert.equal(context.canViewDescription, true);
    assert.equal(context.date.description, privateDescription);
    assert.ok(renderView(context).includes(privateDescription));
});

test('una sesión sin usuario no obtiene permiso para leer la descripción', async () => {
    const context = await viewAs(undefined);
    assert.equal(context.canViewDescription, false);
    assert.ok(!selectedFields.includes('*'));
    assert.ok(!Object.hasOwn(context.date, 'description'));
});

test('el listado de citas no consulta descripciones privadas', async () => {
    let context;
    await controller.getIndex({}, {
        render(view, data) {
            assert.equal(view, 'planner/dates-list');
            context = data;
        },
        status() { assert.fail('El listado debería abrirse'); }
    });
    assert.ok(!selectedFields.includes('*'));
    assert.ok(!selectedFields.includes('description'));
    assert.equal(context.dates[0].title, publicDate.title);
});
