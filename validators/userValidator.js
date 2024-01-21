const Validator = require('validator');
const isEmpty = require('./is-Empty');
module.exports = function validateInputs(data){
    let errors = {}
    
    data.email = !isEmpty(data.email) ? data.email : '';
    data.mobileNo = !isEmpty(data.mobileNo) ? data.mobileNo : '';
    data.firstName = !isEmpty(data.firstName) ? data.firstName : '';
    data.lastname = !isEmpty(data.lastName) ? data.lastName : '';
    data.userName = !isEmpty(data.userName) ? data.userName : '';
    data.password = !isEmpty(data.password) ? data.password : '';
    if(Validator.isEmpty(data.firstName)){
        errors.firstName = 'first name should not be empty'
    }
    if(!Validator.isLength(data.firstName,{min:3,max:20})){
        errors.firstName = 'Your first name must contain atleast 3 characters'
    }
    if(Validator.isEmpty(data.lastName)){
        errors.lastName = 'last name should not be empty'
    }
    if(!Validator.isLength(data.lastName,{min:3,max:20})){
        errors.lastName = 'Your first name must contain atleast 3 characters'
    }
    if(Validator.isEmpty(data.email)){
        errors.email = 'email should not be empty'
    }
    if(!Validator.isEmail(data.email)){
        errors.email = "invalid email format"
    }
    if(Validator.isEmpty(data.password)){
        errors.password = 'password should not empty'
    }
    if(!Validator.isLength(data.password,{min:6,max:20})){
        errors.password = 'password must be atleast 6 characters'
    }
    if(Validator.isEmpty(data.mobileNo)){
        errors.mobileNo = 'Mobile number should not be empty'
    }
    if(!Validator.isLength(data.mobileNo,{min:10,max:10})){
        errors.mobileNo = 'mobile Number should not be exceed 10 digits'
    }
    if(Validator.isEmpty(data.userName)){
        errors.userName = 'username should not be empty'
    }
    if(!Validator.isLength(data.userName,{min:4,max:10})){
        errors.userName = 'username should contain atleast 4 characters'
    }
    const isValid = Object.keys(errors).length === 0;

    return {
        errors,
        isValid
    };
}