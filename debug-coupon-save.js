// Debug-Script um das echte Coupon-Speicherproblem zu finden
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qlwlarfjwiqevxusiffm.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCouponSave() {
  console.log('🔍 Testing real coupon save...')
  
  // Test 1: Check table structure
  const { data: tableInfo, error: tableError } = await supabase
    .from('coupons')
    .select('*')
    .limit(1)
    
  if (tableError) {
    console.error('❌ Table access error:', tableError)
    return
  }
  
  console.log('✅ Table accessible')
  if (tableInfo.length > 0) {
    console.log('📊 Table structure (first row keys):', Object.keys(tableInfo[0]))
  }
  
  // Test 2: Try minimal insert
  const testCoupon = {
    title: 'Test Coupon Debug',
    barcode_type: 'ean13',
    barcode_value: '1234567890123',
    valid_until: '2024-12-31',
    store_id: null,
    created_by: null
  }
  
  console.log('🧪 Testing insert with minimal data:', testCoupon)
  
  const { data: insertData, error: insertError } = await supabase
    .from('coupons')
    .insert([testCoupon])
    .select()
    
  if (insertError) {
    console.error('❌ INSERT ERROR:', insertError)
    console.error('   Error details:', JSON.stringify(insertError, null, 2))
  } else {
    console.log('✅ Insert successful:', insertData)
    
    // Clean up test data
    if (insertData[0]?.id) {
      await supabase.from('coupons').delete().eq('id', insertData[0].id)
      console.log('🧹 Test data cleaned up')
    }
  }
}

testCouponSave().catch(console.error)
