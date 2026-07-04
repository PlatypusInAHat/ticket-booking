let sdk;
let started = false;

const normalizeOtlpTracesEndpoint = () => {
  if (process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) {
    return process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
  }

  const baseEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!baseEndpoint) {
    return '';
  }

  return `${baseEndpoint.replace(/\/$/, '')}/v1/traces`;
};

const startTracing = ({ serviceName }) => {
  if (started || process.env.NODE_ENV === 'test' || process.env.OTEL_ENABLED === 'false') {
    return null;
  }

  const tracesEndpoint = normalizeOtlpTracesEndpoint();
  if (!tracesEndpoint) {
    return null;
  }

  process.env.OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME || serviceName;

  // OpenTelemetry must be initialized before instrumented libraries are loaded.
  // eslint-disable-next-line global-require
  const { NodeSDK } = require('@opentelemetry/sdk-node');
  // eslint-disable-next-line global-require
  const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
  // eslint-disable-next-line global-require
  const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

  sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
      url: tracesEndpoint
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false
        }
      })
    ]
  });

  sdk.start();
  started = true;
  console.log(`[tracing] OpenTelemetry enabled for ${serviceName}: ${tracesEndpoint}`);

  const shutdown = async () => {
    if (!sdk) {
      return;
    }

    try {
      await sdk.shutdown();
    } catch (error) {
      console.error('[tracing] shutdown failed:', error.message);
    }
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  return sdk;
};

module.exports = {
  startTracing
};
