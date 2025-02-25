import React from 'react'
import { SignIn } from '@clerk/nextjs'
function page() {
  return (
    <div className='flex justify-center items-center h-screen'>
      <SignIn />
    </div>
  )
}

export default page
