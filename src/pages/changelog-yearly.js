import React from 'react'
import Layout from "@theme/Layout";
import OpenStickyButton from "../components/buttons/openStickyButton";
import Contributing from '../../changelog/yearly/2022.md'

function changelogYearly() {

    console.log(Contributing);
    return (
      <Layout description="Changelog Yearly Developer Portal">
        <main style={{padding: 50}}>
            <Contributing />
        </main>
        <OpenStickyButton/>
      </Layout>
    );
}

export default changelogYearly;
