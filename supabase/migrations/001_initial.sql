-- ============================================================
-- AIRADECO - Migración inicial
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- ─── Profiles (extensión de auth.users) ─────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id   UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'vendedor',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios autenticados pueden ver perfiles"
  ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuario puede actualizar su propio perfil"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ─── Clients ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT DEFAULT '',
  email      TEXT DEFAULT '',
  address    TEXT DEFAULT '',
  city       TEXT DEFAULT '',
  province   TEXT DEFAULT '',
  notes      TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados gestionan clientes"
  ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── Products ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT DEFAULT '',
  cost_price  DECIMAL(12,2) DEFAULT 0,
  sale_price  DECIMAL(12,2) DEFAULT 0,
  stock       INTEGER DEFAULT 0,
  description TEXT DEFAULT '',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados gestionan productos"
  ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── Shipping Zones ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipping_zones (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  price       DECIMAL(12,2) DEFAULT 0,
  description TEXT DEFAULT ''
);

ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados gestionan zonas"
  ON shipping_zones FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── Orders ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number       TEXT UNIQUE NOT NULL,
  client_id          TEXT DEFAULT '',
  client_name        TEXT NOT NULL,
  seller             TEXT NOT NULL,
  channel            TEXT NOT NULL,
  items              JSONB DEFAULT '[]'::jsonb,
  shipping_zone_id   TEXT DEFAULT '',
  shipping_zone_name TEXT DEFAULT 'Sin envío',
  shipping_cost      DECIMAL(12,2) DEFAULT 0,
  subtotal           DECIMAL(12,2) DEFAULT 0,
  total              DECIMAL(12,2) DEFAULT 0,
  total_cost         DECIMAL(12,2) DEFAULT 0,
  amount_paid        DECIMAL(12,2) DEFAULT 0,
  payment_status     TEXT DEFAULT 'pendiente',
  status             TEXT DEFAULT 'pendiente',
  notes              TEXT DEFAULT '',
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados gestionan pedidos"
  ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── Expenses ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount      DECIMAL(12,2) DEFAULT 0,
  category    TEXT DEFAULT '',
  date        DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados gestionan gastos"
  ON expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── Trigger: crear perfil al registrar usuario ───────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Datos iniciales: zonas de envío ─────────────────────────
INSERT INTO shipping_zones (name, price, description) VALUES
  ('Local (mismo barrio)', 0,    'Entrega sin costo'),
  ('CABA / GBA Zona 1',   2500, 'Capital y zona norte/sur cercana'),
  ('GBA Zona 2',          4500, 'Gran Buenos Aires lejano'),
  ('Interior del país',   8000, 'Envío por transporte/flota')
ON CONFLICT DO NOTHING;

-- ─── Datos iniciales: productos de ejemplo ───────────────────
INSERT INTO products (name, category, cost_price, sale_price, stock) VALUES
  ('Sillón esquinero',     'Sillones',  85000,  130000, 3),
  ('Mesa ratona vidrio',   'Mesas',     42000,   68000, 5),
  ('Cama sommier 2 plazas','Camas',    120000,  185000, 2),
  ('Comedor 6 sillas',     'Comedores',165000,  250000, 1)
ON CONFLICT DO NOTHING;
