import { useEffect, useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function Section({ title, children, actions }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        {actions}
      </div>
      {children}
    </div>
  )
}

function App() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Ingredient form state
  const [ing, setIng] = useState({
    name: '',
    category: 'milk',
    cost_per_kg: 0,
    total_solids_pct: 0,
    fat_pct: 0,
    sugar_pct: 0,
    lactose_pct: 0,
    stabilizer_pct: 0,
    sweetness_equiv: 1,
    allergens: '',
    energy_kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    sugars_g: 0,
    fat_g: 0,
    sat_fat_g: 0,
    fiber_g: 0,
    salt_g: 0,
  })
  const [ingredients, setIngredients] = useState([])

  // Recipe form
  const [recipeName, setRecipeName] = useState('Fiordilatte')
  const [components, setComponents] = useState([]) // {ingredient_id, grams}
  const [computed, setComputed] = useState(null)

  const fetchIngredients = async () => {
    const res = await fetch(`${API_BASE}/api/ingredients`)
    const data = await res.json()
    setIngredients(data)
  }

  useEffect(() => {
    fetchIngredients()
  }, [])

  const addIngredient = async () => {
    setLoading(true)
    setMessage('')
    try {
      const payload = {
        ...ing,
        allergens: ing.allergens ? ing.allergens.split(',').map(a => a.trim()).filter(Boolean) : [],
        cost_per_kg: Number(ing.cost_per_kg) || 0,
        total_solids_pct: Number(ing.total_solids_pct) || 0,
        fat_pct: Number(ing.fat_pct) || 0,
        sugar_pct: Number(ing.sugar_pct) || 0,
        lactose_pct: Number(ing.lactose_pct) || 0,
        stabilizer_pct: Number(ing.stabilizer_pct) || 0,
        sweetness_equiv: Number(ing.sweetness_equiv) || 1,
        energy_kcal: Number(ing.energy_kcal) || 0,
        protein_g: Number(ing.protein_g) || 0,
        carbs_g: Number(ing.carbs_g) || 0,
        sugars_g: Number(ing.sugars_g) || 0,
        fat_g: Number(ing.fat_g) || 0,
        sat_fat_g: Number(ing.sat_fat_g) || 0,
        fiber_g: Number(ing.fiber_g) || 0,
        salt_g: Number(ing.salt_g) || 0,
      }
      const res = await fetch(`${API_BASE}/api/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Errore creazione ingrediente')
      setMessage('Ingrediente salvato')
      setIng(prev => ({ ...prev, name: '' }))
      await fetchIngredients()
    } catch (e) {
      setMessage(e.message)
    } finally {
      setLoading(false)
    }
  }

  const addComponent = () => {
    if (!ingredients.length) return
    const first = ingredients[0]
    setComponents(prev => [...prev, { ingredient_id: first.id || first._id, grams: 100 }])
  }

  const saveRecipe = async () => {
    if (!recipeName || components.length === 0) {
      setMessage('Aggiungi ingredienti alla ricetta')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const payload = { name: recipeName, components }
      const res = await fetch(`${API_BASE}/api/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || 'Errore salvataggio ricetta')
      // compute metrics
      const res2 = await fetch(`${API_BASE}/api/recipes/compute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_id: data.id }),
      })
      const m = await res2.json()
      setComputed(m)
      setMessage('Ricetta salvata e bilanciata')
    } catch (e) {
      setMessage(e.message)
    } finally {
      setLoading(false)
    }
  }

  const [tutorials, setTutorials] = useState([])
  useEffect(() => {
    fetch(`${API_BASE}/api/tutorials`).then(r => r.json()).then(setTutorials).catch(() => {})
  }, [])

  // Inventory module state
  const [movement, setMovement] = useState({
    type: 'in',
    ingredient_id: '',
    lot_code: '',
    qty_kg: 1,
    expiry_date: '',
    cost_per_kg: '',
    supplier: '',
    reason: 'purchase',
    note: '',
  })
  const [inventory, setInventory] = useState([])
  const [expiring, setExpiring] = useState([])

  const fetchInventory = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/inventory/items`)
      const data = await r.json()
      setInventory(Array.isArray(data) ? data : [])
    } catch {}
  }
  const fetchExpiring = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/inventory/expiring?days=14`)
      const data = await r.json()
      setExpiring(Array.isArray(data) ? data : [])
    } catch {}
  }

  useEffect(() => {
    fetchInventory()
    fetchExpiring()
  }, [])

  useEffect(() => {
    // default ingredient selection
    if (!movement.ingredient_id && ingredients.length) {
      setMovement(m => ({ ...m, ingredient_id: ingredients[0].id || ingredients[0]._id }))
    }
  }, [ingredients])

  const submitMovement = async () => {
    if (!movement.ingredient_id || !movement.lot_code || !movement.qty_kg) {
      setMessage('Compila ingrediente, lotto e quantità')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const payload = {
        ...movement,
        qty_kg: Number(movement.qty_kg),
        cost_per_kg: movement.cost_per_kg === '' ? undefined : Number(movement.cost_per_kg),
        expiry_date: movement.expiry_date ? new Date(movement.expiry_date).toISOString() : undefined,
      }
      const res = await fetch(`${API_BASE}/api/inventory/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || 'Errore movimento inventario')
      setMessage('Movimento registrato')
      setMovement(m => ({ ...m, qty_kg: 1, note: '' }))
      await fetchInventory()
      await fetchExpiring()
    } catch (e) {
      setMessage(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-pink-500 to-sky-500" />
            <h1 className="text-xl font-bold text-gray-800">Gelato Pro Suite</h1>
          </div>
          <div className="text-xs text-gray-500">API: {API_BASE}</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Nuovo ingrediente">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input className="input" placeholder="Nome" value={ing.name} onChange={e=>setIng({...ing, name:e.target.value})} />
              <input className="input" placeholder="Categoria" value={ing.category} onChange={e=>setIng({...ing, category:e.target.value})} />
              <input className="input" type="number" placeholder="Costo/kg" value={ing.cost_per_kg} onChange={e=>setIng({...ing, cost_per_kg:e.target.value})} />
              <input className="input" type="text" placeholder="Allergeni (virgola)" value={ing.allergens} onChange={e=>setIng({...ing, allergens:e.target.value})} />
              <input className="input" type="number" placeholder="Solidi %" value={ing.total_solids_pct} onChange={e=>setIng({...ing, total_solids_pct:e.target.value})} />
              <input className="input" type="number" placeholder="Grassi %" value={ing.fat_pct} onChange={e=>setIng({...ing, fat_pct:e.target.value})} />
              <input className="input" type="number" placeholder="Zuccheri %" value={ing.sugar_pct} onChange={e=>setIng({...ing, sugar_pct:e.target.value})} />
              <input className="input" type="number" placeholder="Lattosio %" value={ing.lactose_pct} onChange={e=>setIng({...ing, lactose_pct:e.target.value})} />
              <input className="input" type="number" placeholder="Stabilizzanti %" value={ing.stabilizer_pct} onChange={e=>setIng({...ing, stabilizer_pct:e.target.value})} />
              <input className="input" type="number" step="0.01" placeholder="Dolcezza rel." value={ing.sweetness_equiv} onChange={e=>setIng({...ing, sweetness_equiv:e.target.value})} />
              <input className="input" type="number" placeholder="Kcal" value={ing.energy_kcal} onChange={e=>setIng({...ing, energy_kcal:e.target.value})} />
              <input className="input" type="number" placeholder="Proteine g" value={ing.protein_g} onChange={e=>setIng({...ing, protein_g:e.target.value})} />
              <input className="input" type="number" placeholder="Carbo g" value={ing.carbs_g} onChange={e=>setIng({...ing, carbs_g:e.target.value})} />
              <input className="input" type="number" placeholder="Zuccheri g" value={ing.sugars_g} onChange={e=>setIng({...ing, sugars_g:e.target.value})} />
              <input className="input" type="number" placeholder="Grassi g" value={ing.fat_g} onChange={e=>setIng({...ing, fat_g:e.target.value})} />
              <input className="input" type="number" placeholder="Sat. g" value={ing.sat_fat_g} onChange={e=>setIng({...ing, sat_fat_g:e.target.value})} />
              <input className="input" type="number" placeholder="Fibra g" value={ing.fiber_g} onChange={e=>setIng({...ing, fiber_g:e.target.value})} />
              <input className="input" type="number" placeholder="Sale g" value={ing.salt_g} onChange={e=>setIng({...ing, salt_g:e.target.value})} />
            </div>
            <div className="mt-3">
              <button onClick={addIngredient} disabled={loading} className="btn-primary">Salva ingrediente</button>
            </div>
          </Section>

          <Section title="Ricetta e bilanciamento" actions={<button onClick={addComponent} className="btn-secondary">Aggiungi componente</button>}>
            <div className="grid md:grid-cols-3 gap-3 mb-3">
              <input className="input md:col-span-2" placeholder="Nome ricetta" value={recipeName} onChange={e=>setRecipeName(e.target.value)} />
            </div>
            <div className="space-y-2">
              {components.map((c, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <select className="col-span-7 input" value={c.ingredient_id} onChange={e=>{
                    const v = e.target.value
                    setComponents(prev => prev.map((p,i)=> i===idx ? {...p, ingredient_id: v} : p))
                  }}>
                    {ingredients.map(i => (
                      <option key={i.id || i._id} value={i.id || i._id}>{i.name}</option>
                    ))}
                  </select>
                  <input className="col-span-4 input" type="number" value={c.grams}
                    onChange={e=>{
                      const v = Number(e.target.value) || 0
                      setComponents(prev => prev.map((p,i)=> i===idx ? {...p, grams: v} : p))
                    }} />
                  <button className="col-span-1 text-red-500" onClick={()=> setComponents(prev => prev.filter((_,i)=>i!==idx))}>×</button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button onClick={saveRecipe} disabled={loading} className="btn-primary">Salva & Calcola</button>
              <a className="btn-ghost" href={`${API_BASE}/api/export/recipes.csv`} target="_blank" rel="noreferrer">Export Ricette CSV</a>
              <a className="btn-ghost" href={`${API_BASE}/api/export/labels.csv`} target="_blank" rel="noreferrer">Export Etichette CSV</a>
            </div>
            {computed && (
              <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(computed).map(([k,v]) => (
                  <div key={k} className="p-3 rounded-lg bg-gray-50 text-sm"><div className="text-gray-500">{k}</div><div className="font-semibold">{v}</div></div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Magazzino ingredienti (avanzato)" actions={
            <div className="flex gap-2">
              <a className="btn-ghost" href={`${API_BASE}/api/export/inventory.csv`} target="_blank" rel="noreferrer">Export CSV</a>
              <a className="btn-ghost" href={`${API_BASE}/api/export/movements.csv`} target="_blank" rel="noreferrer">Movimenti CSV</a>
              <a className="btn-ghost" href={`${API_BASE}/api/export/inventory.pdf`} target="_blank" rel="noreferrer">Export PDF</a>
            </div>
          }>
            <div className="grid md:grid-cols-6 gap-3">
              <select className="input md:col-span-2" value={movement.ingredient_id} onChange={e=>setMovement(m=>({...m, ingredient_id: e.target.value}))}>
                {ingredients.map(i => (
                  <option key={i.id || i._id} value={i.id || i._id}>{i.name}</option>
                ))}
              </select>
              <input className="input" placeholder="Lotto" value={movement.lot_code} onChange={e=>setMovement(m=>({...m, lot_code: e.target.value}))} />
              <input className="input" type="number" step="0.001" placeholder="Qta kg" value={movement.qty_kg} onChange={e=>setMovement(m=>({...m, qty_kg: e.target.value}))} />
              <select className="input" value={movement.type} onChange={e=>setMovement(m=>({...m, type: e.target.value}))}>
                <option value="in">Carico</option>
                <option value="out">Scarico</option>
              </select>
              <input className="input" type="date" value={movement.expiry_date} onChange={e=>setMovement(m=>({...m, expiry_date: e.target.value}))} />
              <input className="input" type="number" step="0.01" placeholder="Costo/kg" value={movement.cost_per_kg} onChange={e=>setMovement(m=>({...m, cost_per_kg: e.target.value}))} />
              <input className="input" placeholder="Fornitore" value={movement.supplier} onChange={e=>setMovement(m=>({...m, supplier: e.target.value}))} />
              <input className="input md:col-span-3" placeholder="Motivo (acquisto, produzione, scarto, correzione)" value={movement.reason} onChange={e=>setMovement(m=>({...m, reason: e.target.value}))} />
              <input className="input md:col-span-6" placeholder="Nota" value={movement.note} onChange={e=>setMovement(m=>({...m, note: e.target.value}))} />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button className="btn-primary" disabled={loading} onClick={submitMovement}>Registra movimento</button>
              <button className="btn-secondary" onClick={()=>{fetchInventory(); fetchExpiring();}}>Aggiorna</button>
            </div>

            <div className="mt-5 grid md:grid-cols-2 gap-5">
              <div>
                <div className="text-sm font-medium mb-2">Giacenze per lotto</div>
                <div className="max-h-72 overflow-auto border rounded-lg divide-y">
                  {inventory.map(it => (
                    <div key={it.id} className="p-3 text-sm flex items-center justify-between">
                      <div>
                        <div className="font-medium">{it.ingredient_name || it.ingredient_id}</div>
                        <div className="text-gray-500">Lotto {it.lot_code || '-'} · Scadenza {it.expiry_date ? new Date(it.expiry_date).toLocaleDateString() : '-'} · Stato {it.status}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{it.qty_kg} kg</div>
                        <div className="text-gray-500 text-xs">{it.supplier || ''}</div>
                      </div>
                    </div>
                  ))}
                  {!inventory.length && <div className="p-4 text-sm text-gray-500">Nessuna giacenza</div>}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">In scadenza (14 giorni)</div>
                <div className="max-h-72 overflow-auto border rounded-lg divide-y">
                  {expiring.map((it, idx) => (
                    <div key={it.id || idx} className="p-3 text-sm flex items-center justify-between">
                      <div>
                        <div className="font-medium">{it.ingredient_id}</div>
                        <div className="text-gray-500">Lotto {it.lot_code || '-'} · Scadenza {it.expiry_date ? new Date(it.expiry_date).toLocaleDateString() : '-'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{Number(it.qty_kg || it.qty || 0).toFixed(3)} kg</div>
                      </div>
                    </div>
                  ))}
                  {!expiring.length && <div className="p-4 text-sm text-gray-500">Nessun prodotto in scadenza</div>}
                </div>
              </div>
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Ingredienti salvati">
            <div className="max-h-80 overflow-auto divide-y">
              {ingredients.map(i => (
                <div key={i.id} className="py-2 text-sm flex items-center justify-between">
                  <div>
                    <div className="font-medium">{i.name}</div>
                    <div className="text-gray-500">{i.category} · costo {i.cost_per_kg}/kg</div>
                  </div>
                  <div className="text-gray-400">{i.fat_pct || 0}% grassi</div>
                </div>
              ))}
              {!ingredients.length && <div className="text-sm text-gray-500 py-4">Nessun ingrediente</div>}
            </div>
          </Section>

          <Section title="Tutorial video">
            <div className="space-y-3">
              {tutorials.map((t, i) => (
                <a key={i} href={t.url} target="_blank" className="block p-3 rounded-lg border hover:shadow-sm transition">
                  <div className="text-sm text-gray-500">{t.category}</div>
                  <div className="font-medium">{t.title}</div>
                </a>
              ))}
            </div>
          </Section>

          {message && (
            <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">{message}</div>
          )}
        </div>
      </main>

      <style>{`
        .input { @apply w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white; }
        .btn-primary { @apply px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition; }
        .btn-secondary { @apply px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700; }
        .btn-ghost { @apply px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700; }
      `}</style>
    </div>
  )
}

export default App
