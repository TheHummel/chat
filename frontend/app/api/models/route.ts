import { NextResponse } from 'next/server'

interface MistralModel {
    id: string
    object: string
    created: number
    owned_by: string
    capabilities?: any
}

interface MistralResponse {
    data: MistralModel[]
    object: string
}

export async function GET() {
    try {
        const apiKey = process.env.MISTRAL_API_KEY
        
        if (!apiKey) {
            return NextResponse.json(
                { error: 'MISTRAL_API_KEY not configured' },
                { status: 500 }
            )
        }

        const response = await fetch('https://api.mistral.ai/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        })

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch Mistral models' },
                { status: response.status }
            )
        }

        const mistralData: MistralResponse = await response.json()
        
        // remove duplicates
        const uniqueModelsMap = new Map<string, MistralModel>()
        mistralData.data.forEach(model => {
            if (!uniqueModelsMap.has(model.id)) {
                uniqueModelsMap.set(model.id, model)
            }
        })
        
        const transformedData = {
            providers: {
                mistral: Array.from(uniqueModelsMap.values()).map(model => ({
                    id: model.id,
                    name: formatModelName(model.id),
                    full_name: model.id
                }))
            },
            default_models: {
                mistral: 'mistral-large-latest'
            }
        }

        return NextResponse.json(transformedData)
    } catch (error) {
        console.error('Failed to fetch Mistral models:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

function formatModelName(id: string): string {
    return id
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}
