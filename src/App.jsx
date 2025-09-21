import { useState, useEffect } from "react"
import { supabase } from "./supabaseClient"
import Login from "./Login"

function App() {
  const [user, setUser] = useState(null)
  const [products, setProducts] = useState([])
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [quantity, setQuantity] = useState("")
  const [soldPriceInput, setSoldPriceInput] = useState({})
  const [monthlyAudits, setMonthlyAudits] = useState([])
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  // Check session & listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // Capture PWA install prompt event
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e) // store event for later
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      console.log("User choice:", choiceResult.outcome)
      setDeferredPrompt(null)
    } else {
      alert("PWA install not available yet. Refresh page or try again later.")
    }
  }

  // Fetch products & audits when user logs in
  useEffect(() => {
    if (user) {
      fetchProducts()
      fetchMonthlyAudits()
    }
  }, [user])

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: false })
    if (error) alert("Error fetching products: " + error.message)
    else setProducts(data)
  }

  const fetchMonthlyAudits = async () => {
    const { data, error } = await supabase
      .from("monthly_audits")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) alert("Error fetching monthly audits: " + error.message)
    else setMonthlyAudits(data)
  }

  const addProduct = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from("products").insert([
      {
        name,
        price: price ? Number(price) : null,
        quantity_available: quantity ? Number(quantity) : 1,
        sold_prices: []
      }
    ])
    if (error) alert("Error adding product: " + error.message)
    else {
      setName("")
      setPrice("")
      setQuantity("")
      fetchProducts()
    }
  }

  const handleSold = async (product) => {
    const soldPrice = Number(soldPriceInput[product.id])
    if (!soldPrice || soldPrice <= 0) {
      alert("Enter a valid sold price")
      return
    }
    if (product.quantity_available <= 0) {
      alert("No quantity available to sell!")
      return
    }
    const newSoldPrices = product.sold_prices ? [...product.sold_prices, soldPrice] : [soldPrice]
    const newQuantity = product.quantity_available - 1

    const { error } = await supabase
      .from("products")
      .update({ sold_prices: newSoldPrices, quantity_available: newQuantity })
      .eq("id", product.id)

    if (error) alert("Error updating product: " + error.message)
    else {
      setSoldPriceInput({ ...soldPriceInput, [product.id]: "" })
      fetchProducts()
    }
  }

  const generateMonthlyAudit = async () => {
    if (products.length === 0) {
      alert("No products available to calculate audit")
      return
    }

    const productsSummary = products.map((p) => {
      const quantitySold = p.sold_prices ? p.sold_prices.length : 0
      const revenue = p.sold_prices ? p.sold_prices.reduce((a, b) => a + b, 0) : 0
      return {
        id: p.id,
        name: p.name,
        original_price: p.price,
        quantity_sold: quantitySold,
        quantity_remaining: p.quantity_available,
        total_revenue: revenue
      }
    })

    const totalRevenue = productsSummary.reduce((sum, p) => sum + p.total_revenue, 0)
    const monthYear = new Date().toLocaleString("default", { month: "short", year: "numeric" })

    const { error } = await supabase
      .from("monthly_audits")
      .insert([{ month_year: monthYear, total_revenue: totalRevenue, products_summary: productsSummary }])

    if (error) alert("Error generating audit: " + error.message)
    else {
      alert(`Monthly audit generated for ${monthYear} - ₦${totalRevenue}`)
      fetchMonthlyAudits()
    }
  }

  if (!user) return <Login onLogin={setUser} />

  return (
    <div style={{ padding: "20px" }}>
      <h1>Welcome {user.email}</h1>
      <button onClick={() => supabase.auth.signOut()}>Logout</button>
      {/* Install button always visible */}
      <button onClick={handleInstallClick} style={{ marginLeft: "10px" }}>
        Install App
      </button>

      <hr />
      <h2>Add Product</h2>
      <form onSubmit={addProduct}>
        <input
          type="text"
          placeholder="Product name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Original price (optional)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <input
          type="number"
          placeholder="Quantity available"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
        <button type="submit">Add Product</button>
      </form>

      <hr />
      <h2>Products</h2>
      <ul>
        {products.map((p) => {
          const totalRevenue = p.sold_prices ? p.sold_prices.reduce((a, b) => a + b, 0) : 0
          return (
            <li key={p.id} style={{ marginBottom: "15px" }}>
              <b>{p.name}</b> - {p.price ? `₦${p.price}` : "No original price"} | Quantity Available: {p.quantity_available}
              <br />
              Sold Prices: {p.sold_prices && p.sold_prices.length > 0 ? p.sold_prices.join(", ") : "None"}
              <br />
              Total Revenue: ₦{totalRevenue}
              <br />
              <input
                type="number"
                placeholder="Enter sold price"
                value={soldPriceInput[p.id] || ""}
                onChange={(e) => setSoldPriceInput({ ...soldPriceInput, [p.id]: e.target.value })}
                style={{ marginRight: "5px" }}
              />
              <button onClick={() => handleSold(p)}>Sold</button>
            </li>
          )
        })}
      </ul>

      <hr />
      <h2>Monthly Audit</h2>
      <button onClick={generateMonthlyAudit}>Generate Monthly Audit</button>

      <ul>
        {monthlyAudits.map((audit) => (
          <li key={audit.id}>
            {audit.month_year} - Total Revenue: ₦{audit.total_revenue.toLocaleString()}
            <br />
            <details>
              <summary>View Product Details</summary>
              <ul>
                {audit.products_summary &&
                  audit.products_summary.map((prod) => (
                    <li key={prod.id}>
                      {prod.name} - Sold: {prod.quantity_sold}, Remaining: {prod.quantity_remaining}, Revenue: ₦{prod.total_revenue}
                    </li>
                  ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App