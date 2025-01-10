import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface CollectionCardProps {
  collection: {
    name: string
    description: string
    status: string
  }
}

export function CollectionCard({ collection }: CollectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{collection.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{collection.description}</p>
        <p className="mt-2">Status: {collection.status}</p>
        <Button className="mt-4">View Details</Button>
      </CardContent>
    </Card>
  )
}

