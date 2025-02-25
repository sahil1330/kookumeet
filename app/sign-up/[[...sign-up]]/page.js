import React from 'react'
import { SignUp } from '@clerk/nextjs'
function page() {
    return (
        <div className='flex justify-center items-center h-screen'>
            <SignUp />
        </div>
    )
}

export default page
