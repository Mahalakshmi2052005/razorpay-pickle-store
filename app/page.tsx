"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Minus, Plus, ShoppingCart, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

declare global {
  interface Window {
    Razorpay: any
  }
}

const products = [
  {
    id: "lemon-pickle",
    name: "Lemon Pickle",
    description: "Tangy and spicy handcrafted lemon pickle made with fresh ingredients",
    price: 250,
    image: "/fresh-lemon-pickle-in-glass-jar.jpg",
    tag: "Bestseller",
  },
  {
    id: "mango-pickle",
    name: "Mango Pickle",
    description: "Traditional mango pickle with authentic spices and rich flavor",
    price: 300,
    image: "/mango-pickle-in-glass-jar.jpg",
    tag: "Premium",
  },
]

export default function Home() {
  const [quantities, setQuantities] = useState<Record<string, number>>({
    "lemon-pickle": 1,
    "mango-pickle": 1,
  })
  const [loading, setLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const updateQuantity = (productId: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] || 1) + delta),
    }))
  }

  const handlePayment = async (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    setLoading(productId)

    try {
      const quantity = quantities[productId] || 1
      const amount = product.price * quantity

      // Create order
      const orderResponse = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, productId, quantity }),
      })

      const orderData = await orderResponse.json()

      if (!orderResponse.ok) {
        throw new Error(orderData.error || "Failed to create order")
      }

      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement("script")
        script.src = "https://checkout.razorpay.com/v1/checkout.js"
        script.async = true
        document.body.appendChild(script)
        await new Promise((resolve) => {
          script.onload = resolve
        })
      }

      // Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Pickle Store",
        description: `${product.name} x ${quantity}`,
        order_id: orderData.id,
        handler: async (response: any) => {
          try {
            // Verify payment
            const verifyResponse = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })

            const verifyData = await verifyResponse.json()

            if (verifyData.success) {
              toast({
                title: "Payment Successful!",
                description: `Your order for ${product.name} has been confirmed.`,
              })
            } else {
              throw new Error("Payment verification failed")
            }
          } catch (error) {
            toast({
              title: "Payment Verification Failed",
              description: "Please contact support if amount was deducted.",
              variant: "destructive",
            })
          }
        },
        prefill: {
          name: "Customer Name",
          email: "customer@example.com",
          contact: "9999999999",
        },
        theme: {
          color: "#16a34a",
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.open()

      razorpay.on("payment.failed", (response: any) => {
        toast({
          title: "Payment Failed",
          description: response.error.description,
          variant: "destructive",
        })
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground">Pickle Store</h1>
              <p className="text-sm text-muted-foreground">Premium Handcrafted Pickles</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-border bg-gradient-to-b from-accent/30 to-background">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h2 className="text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Authentic Flavors, <span className="text-primary">Delivered Fresh</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg text-muted-foreground">
              Experience the traditional taste of homemade pickles, crafted with love and the finest ingredients
            </p>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
          {products.map((product) => {
            const quantity = quantities[product.id] || 1
            const isLoading = loading === product.id

            return (
              <Card key={product.id} className="overflow-hidden transition-shadow hover:shadow-lg">
                <CardHeader className="relative p-0">
                  <div className="relative h-64 overflow-hidden bg-muted">
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                    />
                    <Badge className="absolute right-4 top-4 bg-secondary text-secondary-foreground">
                      {product.tag}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <CardTitle className="text-2xl font-bold text-foreground">{product.name}</CardTitle>
                  <CardDescription className="mt-2 text-base">{product.description}</CardDescription>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-primary">₹{product.price}</span>
                    <span className="text-sm text-muted-foreground">per jar</span>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 border-t border-border bg-muted/30 p-6">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Quantity</span>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateQuantity(product.id, -1)}
                        disabled={quantity <= 1 || isLoading}
                        className="h-9 w-9"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center text-lg font-semibold text-foreground">{quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateQuantity(product.id, 1)}
                        disabled={isLoading}
                        className="h-9 w-9"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    className="w-full text-base font-semibold"
                    size="lg"
                    onClick={() => handlePayment(product.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      "Processing..."
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        Buy Now - ₹{product.price * quantity}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">Secure payments powered by Razorpay</p>
        </div>
      </footer>
    </main>
  )
}
