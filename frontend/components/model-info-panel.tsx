'use client'

import { useEffect, useState } from 'react'
import { Info, Cpu, Layers, Eye, Code, FileType } from 'lucide-react'
import { useThreadStore } from '@/lib/thread-store'

interface ModelCapabilities {
  completion_chat: boolean
  completion_fim: boolean
  function_calling: boolean
  fine_tuning: boolean
  vision: boolean
  classification: boolean
}

interface ModelInfo {
  id: string
  name: string | null
  description: string | null
  max_context_length: number
  capabilities: ModelCapabilities
  TYPE: string
  root: string
  created: number
}

export function ModelInfoPanel() {
  const { selectedModel } = useThreadStore()
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedModel) return

    const fetchModelInfo = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/models/${selectedModel}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch model info')
        }
        
        const data = await response.json()
        setModelInfo(data)
      } catch (err) {
        console.error('Error fetching model info:', err)
        setError('Failed to load model information')
      } finally {
        setLoading(false)
      }
    }

    fetchModelInfo()
  }, [selectedModel])

  if (loading) {
    return (
      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          <span>Loading model information...</span>
        </div>
      </div>
    )
  }

  if (error || !modelInfo) {
    return null
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const capabilities = [
    { icon: Cpu, label: 'Chat', enabled: modelInfo.capabilities.completion_chat },
    { icon: Code, label: 'FIM', enabled: modelInfo.capabilities.completion_fim },
    { icon: Layers, label: 'Tools', enabled: modelInfo.capabilities.function_calling },
    { icon: Eye, label: 'Vision', enabled: modelInfo.capabilities.vision },
    { icon: FileType, label: 'Classification', enabled: modelInfo.capabilities.classification },
  ]

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Info className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-semibold text-gray-700">Model Information</span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-400 capitalize">{modelInfo.description}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Context:</span>
          <span className="font-medium text-gray-900">
            {formatNumber(modelInfo.max_context_length)} tokens
          </span>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <span className="text-gray-600 block mb-2">Capabilities:</span>
          <div className="flex flex-wrap gap-2">
            {capabilities.map(({ icon: Icon, label, enabled }) => (
              <div
                key={label}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                  enabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
