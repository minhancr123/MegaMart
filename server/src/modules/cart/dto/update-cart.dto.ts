import { PartialType } from '@nestjs/mapped-types';
import { CreateCartDto } from './create-cart.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Min } from 'class-validator';

export class UpdateCartDto extends PartialType(CreateCartDto) {
    @ApiProperty({
        description: 'Quantity of the cart item',
        example: '2',
    })
    @Min(1)
    quantity: number;
    
}
