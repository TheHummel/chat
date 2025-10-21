import { NextResponse } from 'next/server'

export async function GET(
    request: Request,
    { params }: { params: { modelId: string } }
) {
    try {
        const apiKey = process.env.MISTRAL_API_KEY
        
        if (!apiKey) {
            return NextResponse.json(
                { error: 'MISTRAL_API_KEY not configured' },
                { status: 500 }
            )
        }

        const { modelId } = params
        const url = process.env.MISTRAL_API_URL + `/v1/models/${modelId}`

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            next: { revalidate: 300 }
        })

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch model info: ${response.statusText}` },
                { status: response.status }
            )
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error('Failed to fetch model info:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
