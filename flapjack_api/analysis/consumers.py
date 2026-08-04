# Built in imports.
import json
import asyncio
# Third Party imports.
from channels.db import database_sync_to_async
from channels.exceptions import DenyConnection
from channels.generic.websocket import AsyncWebsocketConsumer
from analysis.analysis import Analysis 
from analysis.util import *
from registry.util import get_samples, get_measurements
from plotly.subplots import make_subplots
import plotly
import pandas as pd
import time
import math

@database_sync_to_async
def fetch_measurements(params, signals, user):
    """Resolve the sample query and load its measurements in a worker thread,
    so the sync ORM is not called from the event loop. Scoped to studies the
    user may read."""
    return get_measurements(get_samples(params, user), signals)


@database_sync_to_async
def analyze_sample(analysis, group):
    """Analysis reaches the database for biomass and background."""
    return analysis.analyze_data(group)


class AnalysisConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        await self.accept()
        await self.channel_layer.group_add(
            "analysis",
            self.channel_name
        )
        
    async def receive(self, text_data):
        data = json.loads(text_data)
        if data['type'] == 'analysis':
            await self.generate_data({'params': data['parameters']})

    async def disconnect(self, message):
        await self.channel_layer.group_discard(
            "analysis",
            self.channel_name
        )

    async def generate_data(self, event):
        params = event['params']
        analysis_params = params['analysis']
        signals = params.get('signal')
        df = await fetch_measurements(params, signals, self.user)
        if analysis_params:
            analysis = Analysis(analysis_params, signals)
            await self.run_analysis(df, analysis)
        # Send back finished message
        await self.send(text_data=json.dumps({
            'type': 'finished'
        }))

    async def run_analysis(self, df, analysis):
        grouped = df.groupby('Sample')
        n_samples = len(grouped)
        progress = 0
        for id,g in grouped:
            result_df = await analyze_sample(analysis, g)
            #result_dfs.append(result_df)
            progress += 1
            await self.send(text_data=json.dumps({
                'type': 'progress_update',
                'progress': int(100 * progress / n_samples),
                'data': result_df.to_json()
            }))
            await asyncio.sleep(0)
        #return df

