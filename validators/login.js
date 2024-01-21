const Validator = require('validator');
const isEmpty = require('./is-Empty');

module.exports = function validateLoginInput(data) {
  let errors = {};

  data.emailOrMobileNo = !isEmpty(data.emailOrMobileNo) ? data.emailOrMobileNo : '';
  data.mobileNo = !isEmpty(data.mobileNo) ? data.mobileNo : '';
  data.password = !isEmpty(data.password) ? data.password : '';

  // Validate email or mobileNo
  data.emailOrMobileNo = !isEmpty(data.emailOrMobileNo) ? data.emailOrMobileNo : '';
  data.mobileNo = !isEmpty(data.mobileNo) ? data.mobileNo : '';
  

  // Validate password
  if (Validator.isEmpty(data.password)) {
    errors.password = 'Password should not be empty';
  } else if (!Validator.isLength(data.password, { min: 6, max: 20 })) {
    errors.password = 'Password must be at least 6 characters';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
};
