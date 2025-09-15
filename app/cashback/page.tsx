'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { createClientComponentClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatCurrency } from '@/utils/helpers'
import { CASHBACK_STATUS } from '@/utils/constants'
import {
  PlusIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'
import { Database } from '@/lib/database.types'

type CashbackSubmission = Database['public']['Tables']['cashback_submissions']['Row'] & {
  campaign: Database['public']['Tables']['cashback_campaigns']['Row'] | null
  store: Database['public']['Tables']['stores']['Row'] | null
  payout_account: Database['public']['Tables']['payout_accounts']['Row'] | null
}

export default function CashbackPage() {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState<CashbackSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState('')
  
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadSubmissions()
  }, [user])

  const loadSubmissions = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('cashback_submissions')
        .select(`
          *,
          campaign:cashback_campaigns(*),
          store:stores(*),
          payout_account:payout_accounts(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSubmissions(data || [])
    } catch (error) {
      console.error('Error loading submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSubmissions = submissions.filter(submission => {
    if (selectedStatus && submission.status !== selectedStatus) {
      return false
    }
    return true
  })

  const totalAmount = submissions
    .filter(s => s.status === 'ausgezahlt')
    .reduce((sum, s) => sum + s.amount, 0)

  const pendingAmount = submissions
    .filter(s => s.status === 'genehmigt')
    .reduce((sum, s) => sum + s.amount, 0)

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'entwurf':
        return <ClockIcon className="h-5 w-5 text-gray-500" />
      case 'eingereicht':
        return <ClockIcon className="h-5 w-5 text-blue-500" />
      case 'genehmigt':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'ausgezahlt':
        return <BanknotesIcon className="h-5 w-5 text-green-600" />
      case 'abgelehnt':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 bg-gradient-to-br from-yellow-50/30 via-white to-green-50/30 min-h-screen">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-3xl flex items-center justify-center text-white text-2xl font-bold shadow-xl">
            💰
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Cashback Tracking</h1>
          <p className="text-gray-600 text-lg mb-6">Verwalte und verfolge deine Cashback-Einreichungen</p>
          
          <Link 
            href="/cashback/submit" 
            className="inline-flex items-center bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
          >
            <PlusIcon className="h-6 w-6 mr-3" strokeWidth={2} />
            Cashback einreichen
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 transform hover:scale-[1.02] transition-all duration-200">
            <div className="flex items-center">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 text-green-600 border border-green-200">
                <BanknotesIcon className="h-7 w-7" strokeWidth={2} />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-3xl font-black text-gray-900 mb-1">
                  {formatCurrency(totalAmount)}
                </p>
                <p className="text-sm font-semibold text-gray-600">Bereits erhalten</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 transform hover:scale-[1.02] transition-all duration-200">
            <div className="flex items-center">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 border border-blue-200">
                <ClockIcon className="h-7 w-7" strokeWidth={2} />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-3xl font-black text-gray-900 mb-1">
                  {formatCurrency(pendingAmount)}
                </p>
                <p className="text-sm font-semibold text-gray-600">Noch ausstehend</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 transform hover:scale-[1.02] transition-all duration-200">
            <div className="flex items-center">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 border border-purple-200">
                <CurrencyDollarIcon className="h-7 w-7" strokeWidth={2} />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-3xl font-black text-gray-900 mb-1">
                  {submissions.length}
                </p>
                <p className="text-sm font-semibold text-gray-600">Gesamt Einreichungen</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Schnellaktionen</h2>
            <div className="space-y-3">
              <Link 
                href="/cashback/campaigns" 
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <CurrencyDollarIcon className="h-5 w-5 text-gray-600 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">Aktuelle Aktionen</div>
                  <div className="text-sm text-gray-600">Neue Cashback-Möglichkeiten</div>
                </div>
              </Link>
              
              <Link 
                href="/cashback/submit" 
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <PlusIcon className="h-5 w-5 text-gray-600 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">Neuen Antrag erstellen</div>
                  <div className="text-sm text-gray-600">Cashback einreichen</div>
                </div>
              </Link>

              <Link 
                href="/profile" 
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <BanknotesIcon className="h-5 w-5 text-gray-600 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">Auszahlungskonten</div>
                  <div className="text-sm text-gray-600">IBAN-Daten verwalten</div>
                </div>
              </Link>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter</h2>
            <select
              className="input w-full"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">Alle Status</option>
              {Object.entries(CASHBACK_STATUS).map(([key, status]) => (
                <option key={key} value={key}>{status.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Submissions List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="text-center py-12">
            <CurrencyDollarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Einreichungen gefunden</h3>
            <p className="text-gray-600 mb-4">
              Du hast noch keine Cashback-Anträge erstellt
            </p>
            <Link href="/cashback/submit" className="btn-primary">
              Ersten Antrag erstellen
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.map(submission => (
              <div key={submission.id} className="card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <StatusIcon status={submission.status || 'entwurf'} />
                    <div>
                      <h3 className="font-semibold text-gray-900">{submission.product_name}</h3>
                      {submission.brand && (
                        <p className="text-sm text-gray-600">{submission.brand}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold text-lg text-gray-900">
                      {formatCurrency(submission.amount)}
                    </div>
                     <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${CASHBACK_STATUS[submission.status || 'entwurf'].color}`}>
                       {CASHBACK_STATUS[submission.status || 'entwurf'].icon} {CASHBACK_STATUS[submission.status || 'entwurf'].label}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Kaufdatum:</span><br />
                    {formatDate(submission.purchase_date)}
                  </div>
                  <div>
                    <span className="font-medium">Eingereicht:</span><br />
                    {formatDate(submission.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
