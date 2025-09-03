/* eslint-disable @typescript-eslint/no-explicit-any */


import dynamic from 'next/dynamic';
import React from 'react'
import { ReactSelectComponentProps } from './ReactSelectClient';
const ReactSelectClient = dynamic(() => import("./ReactSelectClient"), { ssr: false });

const ReactSelect = (props: ReactSelectComponentProps<any, boolean>) => {
  return (
    <ReactSelectClient {...(props as any)}/>
  )
}

export default ReactSelect
