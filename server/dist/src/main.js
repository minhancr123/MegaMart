"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api');
    app.enableCors({
        origin: ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true,
    });
    const config = new swagger_1.DocumentBuilder()
        .setTitle('MegaMart API')
        .setDescription('API documentation for MegaMart e-commerce platform')
        .setVersion('1.0')
        .addTag('auth', 'Authentication endpoints')
        .addTag('users', 'User management')
        .addTag('products', 'Product management')
        .addTag('categories', 'Category management')
        .addTag('orders', 'Order management')
        .addTag('cart', 'Shopping cart')
        .addTag('payments', 'Payment processing')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
    }, 'JWT-auth')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });
    const port = process.env.PORT ?? 3001;
    await app.listen(port);
    console.log(`🚀 Server running on: http://localhost:${port}`);
    console.log(`📚 Swagger docs available at: http://localhost:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map